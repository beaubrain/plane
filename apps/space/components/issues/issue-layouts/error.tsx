/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { EmptyStateDetailed } from "@plane/blocks/empty-state";
import { useTranslation } from "@plane/i18n";

export function SomethingWentWrongError() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen w-full place-items-center bg-surface-1 p-6">
      <EmptyStateDetailed
        align="center"
        assetKey="server-error"
        assetClassName="size-40"
        title={t("common.something_went_wrong")}
        description="The public board does not exist. Please check the URL."
      />
    </div>
  );
}
