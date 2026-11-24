# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers, status
from rest_framework.response import Response

from plane.app.permissions import ROLE, ProjectBasePermission, allow_permission
from plane.app.views.base import BaseAPIView
from plane.db.models import WorkName


class WorkNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkName
        fields = ["name"]


class WorkNameEndpoint(BaseAPIView):
    permission_classes = [ProjectBasePermission]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def get(self, request, slug, project_id):
        work_names = WorkName.objects.filter(project_id=project_id, project__workspace__slug=slug).order_by("name")
        search = request.query_params.get("search", "").strip()
        if search:
            work_names = work_names.filter(name__icontains=search)
        return self.paginate(
            request=request,
            queryset=work_names,
            default_per_page=25,
            max_per_page=50,
            on_results=lambda rows: WorkNameSerializer(rows, many=True).data,
        )

    @allow_permission([ROLE.ADMIN])
    def post(self, request, slug, project_id):
        serializer = WorkNameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        work_name, created = WorkName.objects.get_or_create(
            project_id=project_id, name=serializer.validated_data["name"]
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(WorkNameSerializer(work_name).data, status=response_status)
