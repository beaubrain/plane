# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest

from plane.api.serializers.user import UserLiteSerializer as PublicUserLiteSerializer
from plane.app.serializers.user import UserAdminLiteSerializer, UserLiteSerializer, UserMeSerializer, UserSerializer
from plane.db.models import User
from plane.license.api.serializers.admin import InstanceAdminMeSerializer
from plane.space.serializer.user import UserLiteSerializer as SpaceUserLiteSerializer


@pytest.mark.unit
@pytest.mark.parametrize(
    "first_name,last_name,expected",
    [("  Alex", "Morgan  ", "Alex Morgan"), ("", "Morgan", "Morgan"), ("", " ", "alex.email-prefix")],
)
def test_user_serializers_prefer_profile_name_without_changing_stored_fallback(first_name, last_name, expected):
    user = User(first_name=first_name, last_name=last_name, display_name="alex.email-prefix")
    for serializer in (
        UserSerializer,
        UserMeSerializer,
        UserLiteSerializer,
        UserAdminLiteSerializer,
        InstanceAdminMeSerializer,
        PublicUserLiteSerializer,
        SpaceUserLiteSerializer,
    ):
        assert serializer(user).data["display_name"] == expected
    assert user.display_name == "alex.email-prefix"
