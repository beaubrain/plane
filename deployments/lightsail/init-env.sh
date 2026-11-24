#!/usr/bin/env bash
# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: bash init-env.sh <hostname> <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com <full-commit-sha>" >&2
  exit 1
fi

domain=$1
registry=$2
image_tag=$3

if [[ ! $domain =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]; then
  echo "Use a DNS hostname such as plane.beaubrain.bio." >&2
  exit 1
fi
if [[ ! $registry =~ ^[0-9]{12}\.dkr\.ecr\.ap-northeast-2\.amazonaws\.com$ ]]; then
  echo "Use the private ECR registry hostname in ap-northeast-2." >&2
  exit 1
fi
if [[ ! $image_tag =~ ^[0-9a-f]{40}$ ]]; then
  echo "Use the full 40-character commit SHA from the publishing workflow." >&2
  exit 1
fi

if [[ -e .env || -L .env ]]; then
  echo ".env already exists. Update PLANE_IMAGE_TAG in the existing file for later releases." >&2
  exit 1
fi

db_password=$(openssl rand -hex 24)
rabbitmq_password=$(openssl rand -hex 24)
storage_password=$(openssl rand -hex 24)
django_secret=$(openssl rand -hex 32)
live_secret=$(openssl rand -hex 32)

umask 077
set -o noclobber
cat > .env <<EOF
PLANE_DOMAIN=$domain
PLANE_ECR_REGISTRY=$registry
PLANE_IMAGE_TAG=$image_tag
WEB_URL=https://$domain
APP_BASE_URL=https://$domain
ADMIN_BASE_URL=https://$domain
SPACE_BASE_URL=https://$domain
LIVE_BASE_URL=https://$domain
ADMIN_BASE_PATH=/god-mode
SPACE_BASE_PATH=/spaces
LIVE_BASE_PATH=/live
CORS_ALLOWED_ORIGINS=https://$domain
ALLOWED_HOSTS=$domain,api,localhost,127.0.0.1
LISTEN_HTTP_PORT=80
LISTEN_HTTPS_PORT=443
DEBUG=0
ENABLE_SIGNUP=0
GUNICORN_WORKERS=1
SECRET_KEY=$django_secret
LIVE_SERVER_SECRET_KEY=$live_secret
POSTGRES_USER=plane
POSTGRES_PASSWORD=$db_password
POSTGRES_DB=plane
POSTGRES_HOST=plane-db
DATABASE_URL=postgresql://plane:$db_password@plane-db:5432/plane
REDIS_URL=redis://plane-redis:6379/
RABBITMQ_HOST=plane-mq
RABBITMQ_USER=plane
RABBITMQ_PASSWORD=$rabbitmq_password
RABBITMQ_VHOST=plane
USE_MINIO=1
MINIO_ENDPOINT_SSL=1
AWS_REGION=us-east-1
AWS_S3_ENDPOINT_URL=http://plane-minio:9000
AWS_S3_BUCKET_NAME=uploads
AWS_ACCESS_KEY_ID=plane-storage
AWS_SECRET_ACCESS_KEY=$storage_password
EOF

echo "Created .env for https://$domain."
