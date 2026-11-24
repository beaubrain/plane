# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db.models import Count, DecimalField, ExpressionWrapper, F, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from rest_framework import serializers
from rest_framework.response import Response

from plane.utils.user_name import user_name_for_display
from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.app.views.workspace.user import _visible_issues_q
from plane.db.models import Issue, IssueAssignee


class WorkloadQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    assignee_id = serializers.UUIDField(required=False)
    project_ids = serializers.CharField(required=False, allow_blank=True)

    def validate_project_ids(self, value):
        ids = serializers.ListField(child=serializers.UUIDField()).run_validation(value.split(",") if value else [])
        return [str(project_id) for project_id in ids]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs


class AssigneeWorkloadSerializer(serializers.Serializer):
    assignee_id = serializers.UUIDField()
    display_name = serializers.CharField()
    task_count = serializers.IntegerField()
    allocated_hours = serializers.DecimalField(max_digits=18, decimal_places=2, allow_null=True)


class AssignedTaskSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="issue_id")
    name = serializers.CharField(source="issue.name")
    project_id = serializers.UUIDField(source="issue.project_id")
    project_identifier = serializers.CharField(source="issue.project.identifier")
    sequence_id = serializers.IntegerField(source="issue.sequence_id")
    state_name = serializers.CharField(source="issue.state.name", allow_null=True)
    start_date = serializers.DateField(source="issue.start_date", allow_null=True)
    target_date = serializers.DateField(source="issue.target_date", allow_null=True)
    allocated_hours = serializers.DecimalField(max_digits=18, decimal_places=2, allow_null=True)


class AssigneeWorkloadEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug):
        query = WorkloadQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        issues = Issue.issue_objects.filter(
            _visible_issues_q(request.user), workspace__slug=slug, project__deleted_at__isnull=True
        )
        if params.get("project_ids"):
            issues = issues.filter(project_id__in=params["project_ids"])
        if params.get("start_date"):
            issues = issues.alias(schedule_end=Coalesce("target_date", "start_date")).filter(
                schedule_end__gte=params["start_date"]
            )
        if params.get("end_date"):
            issues = issues.alias(schedule_start=Coalesce("start_date", "target_date")).filter(
                schedule_start__lte=params["end_date"]
            )

        assignments = IssueAssignee.objects.filter(issue_id__in=issues.values("pk"))
        assignee_count = (
            IssueAssignee.objects.filter(issue_id=OuterRef("issue_id"))
            .order_by()
            .values("issue_id")
            .annotate(total=Count("id"))
            .values("total")
        )
        hours_per_assignee = ExpressionWrapper(
            F("issue__estimated_hours") / Subquery(assignee_count), output_field=DecimalField()
        )

        if assignee_id := params.get("assignee_id"):
            tasks = (
                assignments.filter(assignee_id=assignee_id)
                .select_related("issue__project", "issue__state")
                .annotate(allocated_hours=hours_per_assignee)
                .order_by("-issue__created_at", "issue_id")
            )
            return self.paginate(
                request=request,
                queryset=tasks,
                default_per_page=25,
                max_per_page=100,
                on_results=lambda page: AssignedTaskSerializer(page, many=True).data,
            )

        workload = (
            assignments.values("assignee_id", display_name=user_name_for_display("assignee"))
            .annotate(task_count=Count("id"), allocated_hours=Sum(hours_per_assignee))
            .order_by("-task_count", "display_name", "assignee_id")
        )
        return Response(AssigneeWorkloadSerializer(workload, many=True).data)
