# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import datetime, time

import pytz
from django.db import migrations, models


SEOUL = pytz.timezone("Asia/Seoul")


def use_seoul_timezone(apps, schema_editor):
    database = schema_editor.connection.alias
    Project = apps.get_model("db", "Project")
    Cycle = apps.get_model("db", "Cycle")
    IntakeIssue = apps.get_model("db", "IntakeIssue")
    User = apps.get_model("db", "User")
    Workspace = apps.get_model("db", "Workspace")

    # Cycles use project-local calendar boundaries, and open intake snoozes use local midnight.
    # Preserve those wall-clock values when moving their project to Seoul.
    cycles = Cycle._base_manager.using(database).exclude(project__timezone=SEOUL.zone).select_related("project")
    pending = []
    fields = ["start_date", "end_date"]
    for cycle in cycles.iterator(chunk_size=500):
        if not cycle.start_date and not cycle.end_date:
            continue
        previous_zone = pytz.timezone(cycle.project.timezone)
        for field in fields:
            value = getattr(cycle, field)
            if value:
                setattr(cycle, field, SEOUL.localize(value.astimezone(previous_zone).replace(tzinfo=None)))
        pending.append(cycle)
        if len(pending) == 500:
            cycles.bulk_update(pending, fields)
            pending.clear()
    cycles.bulk_update(pending, fields)

    snoozes = (
        IntakeIssue._base_manager.using(database)
        .filter(status=0, snoozed_till__isnull=False)
        .exclude(project__timezone=SEOUL.zone)
        .select_related("project")
    )
    pending = []
    for snooze in snoozes.iterator(chunk_size=500):
        day = snooze.snoozed_till.astimezone(pytz.timezone(snooze.project.timezone)).date()
        snooze.snoozed_till = SEOUL.localize(datetime.combine(day, time.min))
        pending.append(snooze)
        if len(pending) == 500:
            snoozes.bulk_update(pending, ["snoozed_till"])
            pending.clear()
    snoozes.bulk_update(pending, ["snoozed_till"])

    for model, field in [(User, "user_timezone"), (Workspace, "timezone"), (Project, "timezone"), (Cycle, "timezone")]:
        model._base_manager.using(database).exclude(**{field: SEOUL.zone}).update(**{field: SEOUL.zone})


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0126_add_work_item_estimated_hours"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cycle",
            name="timezone",
            field=models.CharField(choices=[("Asia/Seoul", "Asia/Seoul")], default="Asia/Seoul", max_length=255),
        ),
        migrations.AlterField(
            model_name="project",
            name="timezone",
            field=models.CharField(choices=[("Asia/Seoul", "Asia/Seoul")], default="Asia/Seoul", max_length=255),
        ),
        migrations.AlterField(
            model_name="user",
            name="user_timezone",
            field=models.CharField(choices=[("Asia/Seoul", "Asia/Seoul")], default="Asia/Seoul", max_length=255),
        ),
        migrations.AlterField(
            model_name="workspace",
            name="timezone",
            field=models.CharField(choices=[("Asia/Seoul", "Asia/Seoul")], default="Asia/Seoul", max_length=255),
        ),
        migrations.RunPython(use_seoul_timezone, migrations.RunPython.noop),
    ]
