/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useState } from "react";
import { observer } from "mobx-react";
import { AddOutline } from "@makeplane/propel/icons";
import { Select } from "@plane/blocks/select";
import type { SelectPaginationParams } from "@plane/blocks/select";
import { setToast } from "@plane/blocks/toast";
import { EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EUserPermissions } from "@plane/types";
import { useUserPermissions } from "@/hooks/store/user";
import { WorkNameService } from "@/services/issue/work-name.service";

type WorkNameOption = { name: string; action?: "create" | "clear" };

type Props = {
  workspaceSlug: string;
  projectId: string;
  value: string;
  disabled: boolean;
  onChange: (name: string) => Promise<void>;
};

const workNameService = new WorkNameService();
const getOptionValue = (option: WorkNameOption) => `${option.action ?? "name"}:${option.name}`;

export const WorkNameSelect = observer(function WorkNameSelect({
  workspaceSlug,
  projectId,
  value,
  disabled,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const { allowPermissions } = useUserPermissions();
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const getValues = useCallback(
    async ({ cursor, search }: SelectPaginationParams) => {
      const query = search?.trim() ?? "";
      const page = await workNameService.list(workspaceSlug, projectId, { cursor, search: query });
      const results: WorkNameOption[] = page.results;
      if (canCreate && !cursor && query && [...query].length <= 255 && !results.some(({ name }) => name === query)) {
        return { ...page, results: [{ name: query, action: "create" as const }, ...results] };
      }
      return page;
    },
    [canCreate, projectId, workspaceSlug]
  );

  const handleChange = async (optionValue: string) => {
    const delimiter = optionValue.indexOf(":");
    const action = optionValue.slice(0, delimiter);
    const name = optionValue.slice(delimiter + 1);
    if (!optionValue || action === "clear") {
      await onChange("");
      return;
    }
    if (action === "name") {
      await onChange(name);
      return;
    }

    setIsCreating(true);
    try {
      const created = await workNameService.create(workspaceSlug, projectId, name);
      await onChange(created.name);
    } catch {
      setToast({ type: "error", title: t("error"), message: t("entity.add.failed", { entity: t("issue.work_name") }) });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Select<WorkNameOption>
      infinite
      getValues={getValues}
      value={value ? { name: value } : null}
      onChange={(optionValue) => void handleChange(optionValue)}
      getOptionValue={getOptionValue}
      getOptionLabel={(option) =>
        option.action === "create" ? t("issue.add_work_name", { name: option.name }) : option.name
      }
      getOptionIcon={(option) => (option.action === "create" ? <AddOutline /> : undefined)}
      headerItems={value ? [{ name: t("common.clear"), action: "clear" }] : undefined}
      placeholder={t("common.select")}
      searchPlaceholder={t("search")}
      emptyMessage={t("no_matching_results")}
      disabled={disabled || isCreating}
    >
      <Select.Trigger<WorkNameOption>
        variant="select-ghost-md"
        className="w-full"
        label={value || t("common.select")}
        tooltip={{ heading: t("issue.work_name"), emptyContent: t("common.none") }}
        data-testid="work-item-work-name-select"
      />
    </Select>
  );
});
