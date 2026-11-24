/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { CheckboxField } from "@makeplane/propel/components/checkbox-field";
import { useTranslation } from "@plane/i18n";
import type { IWebhook } from "@plane/types";

export const INDIVIDUAL_WEBHOOK_OPTIONS: {
  key: keyof IWebhook;
  label: string;
  description: string;
}[] = [
  {
    key: "project",
    label: "common.projects",
    description: "Project created, updated, or deleted",
  },
  {
    key: "cycle",
    label: "common.cycles",
    description: "Cycle created, updated, or deleted",
  },
  {
    key: "issue",
    label: "common.work_items",
    description: "Work item created, updated, deleted, added to a cycle or module",
  },
  {
    key: "module",
    label: "common.modules",
    description: "Module created, updated, or deleted",
  },
  {
    key: "issue_comment",
    label: "common.comments",
    description: "Comment posted, updated, or deleted",
  },
];

type Props = {
  control: Control<IWebhook, any>;
};

export function WebhookIndividualEventOptions({ control }: Props) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 px-6 lg:grid-cols-2">
      {INDIVIDUAL_WEBHOOK_OPTIONS.map((option) => (
        <Controller
          key={option.key}
          control={control}
          name={option.key}
          render={({ field: { onChange, value } }) => (
            <CheckboxField
              name={option.key}
              label={t(option.label)}
              size="lg"
              description={option.description}
              stretch="full"
              checked={value === true}
              onCheckedChange={onChange}
            />
          )}
        />
      ))}
    </div>
  );
}
