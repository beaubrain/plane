# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from importlib import import_module
from types import SimpleNamespace

import pytest
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.test import override_settings

from plane.db.models import Project, ProjectMember, ProjectUserProperty
from plane.db.models.issue import get_default_display_filters


@pytest.mark.contract
@pytest.mark.django_db
def test_project_work_items_default_to_board_and_keep_saved_layout(session_client, workspace, create_user):
    first = Project.objects.create(name="First", identifier="FIRST", workspace=workspace)
    second = Project.objects.create(name="Second", identifier="SECOND", workspace=workspace)
    for project in (first, second):
        ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)

    first_properties = f"/api/workspaces/{workspace.slug}/projects/{first.id}/user-properties/"
    second_properties = f"/api/workspaces/{workspace.slug}/projects/{second.id}/user-properties/"
    initial = session_client.get(first_properties)
    assert initial.status_code == 200, initial.data
    assert initial.data["display_filters"]["layout"] == "kanban"
    assert initial.data["display_filters"]["group_by"] == "state"

    legacy_defaults = get_default_display_filters()
    ProjectUserProperty.objects.filter(project=first).update(display_filters=legacy_defaults)
    saved_layout = {**legacy_defaults, "layout": "list", "group_by": "priority"}
    saved = session_client.patch(second_properties, {"display_filters": saved_layout}, format="json")
    assert saved.status_code == 200, saved.data

    migration_name = "0130_default_project_board_layout"
    migration = import_module(f"plane.db.migrations.{migration_name}")
    with override_settings(MIGRATION_MODULES={}):
        historical_apps = MigrationLoader(None).project_state([("db", migration_name)]).apps
    migration.use_board_for_legacy_defaults(historical_apps, SimpleNamespace(connection=connection))

    migrated = session_client.get(first_properties)
    assert migrated.data["display_filters"]["layout"] == "kanban"
    assert migrated.data["display_filters"]["group_by"] == "state"
    assert session_client.get(second_properties).data["display_filters"] == saved_layout
