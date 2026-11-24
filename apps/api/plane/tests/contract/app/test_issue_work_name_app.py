# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from importlib import import_module
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.test import override_settings
from django.utils import timezone

from plane.db.models import Issue, Project, ProjectMember, WorkName, WorkspaceMember
from plane.tests.factories import UserFactory


@pytest.mark.contract
@pytest.mark.django_db
def test_work_name_is_optional_and_can_be_edited_independently(session_client, workspace, create_user):
    project = Project.objects.create(name="Project", identifier="WORK", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    url = f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/"

    with (
        patch("plane.app.views.issue.base.issue_activity"),
        patch("plane.app.views.issue.base.model_activity"),
        patch("plane.app.views.issue.base.issue_description_version_task"),
    ):
        created = session_client.post(url, {"name": "Task title"}, format="json")
        assert created.status_code == 201, created.data
        assert created.data["work_name"] == ""

        detail = f"{url}{created.data['id']}/"
        updated = session_client.patch(detail, {"work_name": "  업무 이름  "}, format="json")
        assert updated.status_code == 204, updated.data
        saved = session_client.get(detail)
        assert saved.status_code == 200, saved.data
        assert saved.data["work_name"] == "업무 이름"
        assert saved.data["name"] == "Task title"

        assert session_client.patch(detail, {"work_name": "a" * 256}, format="json").status_code == 400
        assert session_client.get(detail).data["work_name"] == "업무 이름"
        assert session_client.patch(detail, {"work_name": ""}, format="json").status_code == 204
        assert session_client.get(detail).data["work_name"] == ""


@pytest.mark.contract
@pytest.mark.django_db
def test_work_names_are_searchable_and_reusable_after_an_issue_is_cleared(session_client, workspace, create_user):
    project = Project.objects.create(name="Project", identifier="WORK", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    other_project = Project.objects.create(name="Other", identifier="OTHER", workspace=workspace)
    WorkName.objects.create(project=other_project, name="검토 비공개")

    catalog = f"/api/workspaces/{workspace.slug}/projects/{project.id}/work-names/"
    created = session_client.post(catalog, {"name": "  기능 검토  "}, format="json")
    assert created.status_code == 201, created.data
    assert created.data == {"name": "기능 검토"}
    repeated = session_client.post(catalog, {"name": "기능 검토"}, format="json")
    assert repeated.status_code == 200, repeated.data
    assert session_client.post(catalog, {"name": " "}, format="json").status_code == 400
    assert session_client.post(catalog, {"name": "a" * 256}, format="json").status_code == 400

    issue = Issue.objects.create(project=project, name="Task title", work_name=created.data["name"])
    detail = f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/"
    with (
        patch("plane.app.views.issue.base.issue_activity"),
        patch("plane.app.views.issue.base.model_activity"),
        patch("plane.app.views.issue.base.issue_description_version_task"),
    ):
        assert session_client.patch(detail, {"work_name": ""}, format="json").status_code == 204

    matches = session_client.get(catalog, {"search": " 검토 "})
    assert matches.status_code == 200, matches.data
    assert matches.data["results"] == [{"name": "기능 검토"}]
    assert session_client.get(catalog, {"search": "비공개"}).data["results"] == []


@pytest.mark.contract
@pytest.mark.django_db
def test_work_name_catalog_uses_project_permissions_and_pagination(session_client, workspace, create_user):
    project = Project.objects.create(name="Project", identifier="WORK", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    WorkName.objects.bulk_create([WorkName(project=project, name=f"Requirement {index:02}") for index in range(26)])
    catalog = f"/api/workspaces/{workspace.slug}/projects/{project.id}/work-names/"

    first = session_client.get(catalog)
    assert first.status_code == 200, first.data
    assert len(first.data["results"]) == 25
    second = session_client.get(catalog, {"cursor": first.data["next_cursor"]})
    assert second.status_code == 200, second.data
    assert second.data["results"] == [{"name": "Requirement 25"}]
    case_insensitive = session_client.get(catalog, {"search": "requirement 25"})
    assert case_insensitive.data["results"] == [{"name": "Requirement 25"}]

    collaborator = UserFactory()
    WorkspaceMember.objects.create(workspace=workspace, member=collaborator, role=15)
    session_client.force_authenticate(user=collaborator)
    assert session_client.get(catalog).status_code == 403
    ProjectMember.objects.create(project=project, workspace=workspace, member=collaborator, role=15)
    assert session_client.get(catalog).status_code == 200
    assert session_client.post(catalog, {"name": "Restricted"}, format="json").status_code == 403


@pytest.mark.contract
@pytest.mark.django_db
def test_existing_issue_work_names_are_seeded_once_per_project(workspace):
    first = Project.objects.create(name="First", identifier="FIRST", workspace=workspace)
    second = Project.objects.create(name="Second", identifier="SECOND", workspace=workspace)
    Issue.objects.create(project=first, name="First item", work_name="공통 업무")
    Issue.objects.create(project=first, name="Second item", work_name="공통 업무")
    Issue.objects.create(project=second, name="Third item", work_name="공통 업무")
    deleted = Issue.objects.create(project=second, name="Deleted item", work_name="삭제된 업무")
    Issue.objects.filter(pk=deleted.pk).update(deleted_at=timezone.now())

    migration_name = "0129_create_work_name_catalog"
    migration = import_module(f"plane.db.migrations.{migration_name}")
    with override_settings(MIGRATION_MODULES={}):
        historical_apps = MigrationLoader(None).project_state([("db", migration_name)]).apps
    for _ in range(2):
        migration.seed_work_names(historical_apps, SimpleNamespace(connection=connection))

    assert set(WorkName.objects.values_list("project_id", "name")) == {
        (first.id, "공통 업무"),
        (second.id, "공통 업무"),
    }
