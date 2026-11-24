# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db.models import F, Value
from django.db.models.functions import Coalesce, Concat, NullIf, Trim


def user_name_for_display(relation: str):
    """Use the profile name in queries without overwriting the stored display name."""
    prefix = f"{relation}__"
    full_name = Trim(Concat(Trim(F(f"{prefix}first_name")), Value(" "), Trim(F(f"{prefix}last_name"))))
    return Coalesce(NullIf(full_name, Value("")), F(f"{prefix}display_name"))
