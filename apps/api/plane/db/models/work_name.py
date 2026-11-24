# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models


class WorkName(models.Model):
    project = models.ForeignKey("db.Project", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "work_names"
        constraints = [models.UniqueConstraint(fields=["project", "name"], name="unique_project_work_name")]
