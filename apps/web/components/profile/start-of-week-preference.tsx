/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { SelectField } from "@makeplane/propel/components/select-field";
import { useTranslation } from "@plane/i18n";
import { formatDayOfWeek } from "@plane/utils";
import { START_OF_THE_WEEK_OPTIONS } from "@plane/constants";
import { setToast } from "@plane/blocks/toast";
import type { EStartOfTheWeek } from "@plane/types";
// components
import { SettingsControlItem } from "@/components/settings/control-item";
// hooks
import { useUserProfile } from "@/hooks/store/user";

export const StartOfWeekPreference = observer(function StartOfWeekPreference() {
  const { t, currentLocale } = useTranslation();
  const title = t("power_k.preferences_actions.update_start_of_week");
  const { data: userProfile, updateUserProfile } = useUserProfile();

  const handleStartOfWeekChange = async (val: EStartOfTheWeek) => {
    try {
      await updateUserProfile({ start_of_the_week: val });
      setToast({
        type: "success",
        title: t("toast.success"),
        message: t("power_k.preferences_actions.toast.generic.success"),
      });
    } catch (_error) {
      setToast({
        type: "error",
        title: t("toast.error"),
        message: t("power_k.preferences_actions.toast.generic.error"),
      });
    }
  };

  return (
    <SettingsControlItem
      title={title}
      control={
        <SelectField<EStartOfTheWeek>
          aria-label={title}
          size="md"
          width="fit"
          options={START_OF_THE_WEEK_OPTIONS.map(({ value }) => ({
            value,
            label: formatDayOfWeek(value, currentLocale),
          }))}
          value={userProfile.start_of_the_week}
          onValueChange={(value) => {
            if (value !== null) void handleStartOfWeekChange(value);
          }}
        />
      }
    />
  );
});
