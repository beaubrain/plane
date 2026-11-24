/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ComponentProps } from "react";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import { useTranslation } from "@plane/i18n";

export function isValidEstimatedHours(value: string | number | null | undefined) {
  return value == null || /^(?:\d{1,6}(?:\.\d{1,2})?|\.\d{1,2})$/.test(String(value));
}

type EstimatedHoursInputProps = Omit<ComponentProps<typeof Input>, "size"> & { className?: string };

export function EstimatedHoursInput({ className, ...props }: EstimatedHoursInputProps) {
  const { t } = useTranslation();

  return (
    <InputGroup size="md" render={<div className={className} />}>
      <Input
        size="md"
        type="number"
        min={0}
        max={999999.99}
        step={0.01}
        aria-label={t("issue.estimated_hours")}
        {...props}
      />
    </InputGroup>
  );
}
