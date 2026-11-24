#!/usr/bin/env bash
# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

set -euo pipefail

lightsail_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf -- "$test_dir"' EXIT
cd -- "$test_dir"

registry=123456789012.dkr.ecr.ap-northeast-2.amazonaws.com
image_tag=0123456789abcdef0123456789abcdef01234567

if bash "$lightsail_dir/init-env.sh" plane.example.com "$registry" latest; then
  echo "A mutable tag was accepted" >&2
  exit 1
fi
test ! -e .env

bash "$lightsail_dir/init-env.sh" plane.example.com "$registry" "$image_tag"
cp .env original.env
if bash "$lightsail_dir/init-env.sh" plane.example.com "$registry" "$image_tag"; then
  echo "Existing configuration was overwritten" >&2
  exit 1
fi
cmp .env original.env

cp "$lightsail_dir/../../docker-compose.yml" "$lightsail_dir/compose.ecr.yml" .
docker compose -f docker-compose.yml -f compose.ecr.yml --profile migration config --format json > compose.json
python3 - "$registry" "$image_tag" <<'PY'
import json
import os
import sys

registry, image_tag = sys.argv[1:]
with open("compose.json", encoding="utf-8") as config_file:
    config = json.load(config_file)
services = config["services"]
assert config["name"] == "plane"
assert os.stat(".env").st_mode & 0o077 == 0
assert all("build" not in service for service in services.values())

for name in ("api", "web", "admin", "space", "live", "proxy"):
    assert services[name]["image"] == f"{registry}/plane/{name}:{image_tag}"
for name in ("worker", "beat-worker", "migrator"):
    assert services[name]["image"] == services["api"]["image"]
assert services["migrator"]["profiles"] == ["migration"]

api = services["api"]["environment"]
live = services["live"]["environment"]
assert api["LIVE_SERVER_SECRET_KEY"] == live["LIVE_SERVER_SECRET_KEY"]
assert api["WEB_URL"] == live["CORS_ALLOWED_ORIGINS"] == "https://plane.example.com"
assert api["POSTGRES_PASSWORD"] == services["plane-db"]["environment"]["POSTGRES_PASSWORD"]
assert api["RABBITMQ_PASSWORD"] == services["plane-mq"]["environment"]["RABBITMQ_DEFAULT_PASS"]
assert api["AWS_SECRET_ACCESS_KEY"] == services["plane-minio"]["environment"]["MINIO_ROOT_PASSWORD"]
assert set(config["volumes"]) == {"pgdata", "redisdata", "rabbitmq_data", "uploads", "caddy-data", "caddy-config"}
print("Lightsail deployment configuration passed.")
PY
