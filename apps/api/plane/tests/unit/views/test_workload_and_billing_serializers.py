# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date
from uuid import uuid4

import pytest

from plane.app.serializers import ProfileSerializer
from plane.app.views.analytic.workload import WorkloadQuerySerializer

pytestmark = pytest.mark.unit


def test_workload_filters_parse_one_day_and_multiple_projects():
    projects = [str(uuid4()), str(uuid4())]
    query = WorkloadQuerySerializer(
        data={"start_date": "2026-11-24", "end_date": "2026-11-24", "project_ids": ",".join(projects)}
    )
    assert query.is_valid(), query.errors
    assert query.validated_data == {
        "start_date": date(2026, 11, 24),
        "end_date": date(2026, 11, 24),
        "project_ids": projects,
    }


def test_profile_api_no_longer_exposes_billing_address_fields():
    assert not {"billing_address", "billing_address_country", "has_billing_address"} & ProfileSerializer().fields.keys()
