/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { SelectField } from "@makeplane/propel/components/select-field";
import { SUPPORTED_LANGUAGES, useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
// components
import { StartOfWeekPreference } from "@/components/profile/start-of-week-preference";
import { SettingsControlItem } from "@/components/settings/control-item";
// hooks
import { useUserProfile } from "@/hooks/store/user";

export const ProfileSettingsLanguagePreferencesList = observer(function ProfileSettingsLanguagePreferencesList() {
  // store hooks
  const { data: profile, updateUserProfile } = useUserProfile();
  // translation
  const { t } = useTranslation();

  const handleLanguageChange = async (value: string) => {
    try {
      await updateUserProfile({ language: value });
      setToast({
        title: t("toast.success"),
        message: t("power_k.preferences_actions.toast.generic.success"),
        type: "success",
      });
    } catch (_error) {
      setToast({
        title: t("toast.error"),
        message: t("power_k.preferences_actions.toast.generic.error"),
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-y-1">
      <SettingsControlItem
        title={t("language")}
        description={t("language_setting")}
        control={
          <SelectField<string>
            aria-label={t("language")}
            size="md"
            width="fit"
            options={SUPPORTED_LANGUAGES}
            value={profile?.language ?? null}
            onValueChange={(value) => {
              if (value !== null) void handleLanguageChange(value);
            }}
            placeholder={t("language")}
          />
        }
      />
      <StartOfWeekPreference />
    </div>
  );
});
