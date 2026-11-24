# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date
from unittest.mock import patch

import pytest
from django.utils import timezone

from plane.db.models import DraftIssue, Issue, IssueAssignee, Project, ProjectMember
from plane.tests.factories import UserFactory

pytestmark = [pytest.mark.contract, pytest.mark.django_db]


@pytest.fixture
def project(workspace, create_user):
    project = Project.objects.create(name="Visible", identifier="VIS", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    return project


def test_schedule_overlap_splits_estimates_and_scopes_tasks(session_client, workspace, project, create_user):
    create_user.first_name = "Alex"
    create_user.last_name = "Morgan"
    create_user.display_name = "alex.email-prefix"
    create_user.save(update_fields=["first_name", "last_name", "display_name"])
    teammate = UserFactory(first_name="", last_name="", display_name="teammate")
    former_assignee = UserFactory()
    hidden_project = Project.objects.create(name="Hidden", identifier="HID", workspace=workspace)
    ProjectMember.objects.create(
        workspace=workspace, project=hidden_project, member=create_user, role=20, deleted_at=timezone.now()
    )

    def assign(name, start, end, hours, *assignees, on_project=project, **fields):
        issue = Issue.objects.create(
            project=on_project,
            workspace=workspace,
            name=name,
            start_date=start,
            target_date=end,
            estimated_hours=hours,
            **fields,
        )
        for assignee in assignees:
            IssueAssignee.objects.create(project=on_project, workspace=workspace, issue=issue, assignee=assignee)
        return issue

    day = date(2026, 11, 24)
    shared = assign("Shared", date(2026, 11, 23), day, "5.50", create_user, teammate)
    IssueAssignee.objects.create(
        project=project, workspace=workspace, issue=shared, assignee=former_assignee, deleted_at=timezone.now()
    )
    due_only = assign("Missing estimate", None, day, None, create_user)
    assign("Single start", day, None, "1.00", teammate)
    assign("Outside range", date(2026, 11, 25), None, "10", create_user)
    assign("Undated", None, None, "10", create_user)
    assign("Other project", day, day, "30", create_user, on_project=hidden_project)
    assign("Archived", day, day, "10", create_user, archived_at=day)
    assign("Draft", day, day, "10", create_user, is_draft=True)

    url = f"/api/workspaces/{workspace.slug}/assignee-workload/"
    params = {"start_date": day.isoformat(), "end_date": day.isoformat()}
    response = session_client.get(url, params)
    assert response.status_code == 200, response.data
    rows = {row["assignee_id"]: row for row in response.data}
    assert set(rows) == {str(create_user.id), str(teammate.id)}
    assert rows[str(create_user.id)]["display_name"] == "Alex Morgan"
    assert rows[str(teammate.id)]["display_name"] == "teammate"
    assert rows[str(create_user.id)]["task_count"] == 2
    assert rows[str(create_user.id)]["allocated_hours"] == "2.75"
    assert rows[str(teammate.id)]["task_count"] == 2
    assert rows[str(teammate.id)]["allocated_hours"] == "3.75"

    details = session_client.get(url, {**params, "assignee_id": create_user.id, "per_page": 1})
    assert details.status_code == 200, details.data
    assert details.data["next_page_results"]
    assert details.data["results"][0]["id"] == str(due_only.id)
    assert details.data["results"][0]["allocated_hours"] is None
    next_page = session_client.get(
        url, {**params, "assignee_id": create_user.id, "per_page": 1, "cursor": details.data["next_cursor"]}
    )
    assert next_page.status_code == 200, next_page.data
    assert next_page.data["results"][0]["id"] == str(shared.id)
    assert next_page.data["results"][0]["allocated_hours"] == "2.75"
    assert not next_page.data["next_page_results"]
    assert session_client.get(url, {"project_ids": hidden_project.id}).data == []

    unfiltered = session_client.get(url)
    all_rows = {row["assignee_id"]: row for row in unfiltered.data}
    assert all_rows[str(create_user.id)]["task_count"] == 4


@pytest.mark.parametrize(
    "params",
    [
        {"start_date": "2026-11-26", "end_date": "2026-11-24"},
        {"start_date": "invalid"},
        {"project_ids": "invalid"},
        {"assignee_id": "invalid"},
    ],
)
def test_invalid_workload_filters_return_bad_request(session_client, workspace, params):
    assert session_client.get(f"/api/workspaces/{workspace.slug}/assignee-workload/", params).status_code == 400


def test_workload_respects_guest_work_item_visibility(session_client, workspace, project, create_user):
    ProjectMember.objects.filter(project=project, member=create_user).update(role=5)
    Project.objects.filter(pk=project.id).update(guest_view_all_features=False)
    for name, author_id in (("Visible", create_user.id), ("Hidden", None)):
        issue = Issue(project=project, workspace=workspace, name=name, estimated_hours="2.00")
        issue.save(created_by_id=author_id)
        IssueAssignee.objects.create(project=project, workspace=workspace, issue=issue, assignee=create_user)

    url = f"/api/workspaces/{workspace.slug}/assignee-workload/"
    response = session_client.get(url)
    assert response.status_code == 200, response.data
    assert response.data[0]["task_count"] == 1
    assert response.data[0]["allocated_hours"] == "2.00"
    details = session_client.get(url, {"assignee_id": create_user.id})
    assert [task["name"] for task in details.data["results"]] == ["Visible"]


def test_estimated_hours_create_read_update_and_clear(session_client, workspace, project):
    url = f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/"
    with patch("plane.app.views.issue.base.issue_activity"), patch("plane.app.views.issue.base.model_activity"):
        created = session_client.post(url, {"name": "Estimate me", "estimated_hours": "2.50"}, format="json")
        assert created.status_code == 201, created.data
        assert created.data["estimated_hours"] == "2.50"
        detail = f"{url}{created.data['id']}/"
        assert session_client.get(detail).data["estimated_hours"] == "2.50"
        assert session_client.patch(detail, {"estimated_hours": "-0.01"}, format="json").status_code == 400
        assert session_client.patch(detail, {"estimated_hours": "1.001"}, format="json").status_code == 400
        assert session_client.patch(detail, {"name": "Renamed"}, format="json").status_code == 204
        assert session_client.get(detail).data["estimated_hours"] == "2.50"
        assert session_client.patch(detail, {"estimated_hours": None}, format="json").status_code == 204
        assert session_client.get(detail).data["estimated_hours"] is None


def test_estimated_hours_survive_draft_conversion(session_client, workspace, project, create_user):
    draft = DraftIssue(workspace=workspace, project=project, name="Draft", estimated_hours="3.25")
    draft.save(created_by_id=create_user.id)
    with patch("plane.app.views.workspace.draft.issue_activity"):
        response = session_client.post(
            f"/api/workspaces/{workspace.slug}/draft-to-issue/{draft.id}/", {"name": "Promoted"}, format="json"
        )
    assert response.status_code == 201, response.data
    assert response.data["estimated_hours"] == "3.25"
