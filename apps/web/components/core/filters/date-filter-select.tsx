/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { CalendarOutline } from "@makeplane/propel/icons";
// ui
import { CalendarAfterIcon, CalendarBeforeIcon } from "@plane/blocks/icons";
import { Select } from "@plane/blocks/select";
import { useTranslation } from "@plane/i18n";

type Props = {
  title: string;
  value: string;
  onChange: (value: string) => void;
};

type DueDate = {
  value: string;
  icon: React.ReactNode;
};

const dueDateRange: DueDate[] = [
  {
    value: "before",
    icon: <CalendarBeforeIcon className="h-4 w-4" />,
  },
  {
    value: "after",
    icon: <CalendarAfterIcon className="h-4 w-4" />,
  },
  {
    value: "range",
    icon: <CalendarOutline className="h-4 w-4" />,
  },
];

export function DateFilterSelect({ title, value, onChange }: Props) {
  const { t } = useTranslation();
  const formatOptionLabel = (option: DueDate) => `${title} ${t(`date_filter.${option.value}`)}`;
  const selected = dueDateRange.find((item) => item.value === value) ?? null;

  return (
    <Select<DueDate>
      getValues={() => dueDateRange}
      value={selected}
      onChange={onChange}
      getOptionValue={(option) => option.value}
      getOptionLabel={formatOptionLabel}
      getOptionIcon={(option) => option.icon}
      showSearch={false}
      pinSelected={false}
      placeholder={title}
    >
      <Select.Trigger variant="select-md">
        <span className="flex items-center gap-2 text-caption-sm-regular">
          {selected?.icon}
          <span>{selected ? formatOptionLabel(selected) : title}</span>
        </span>
      </Select.Trigger>
    </Select>
  );
}
