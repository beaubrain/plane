/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { EmptyStateDetailed } from "@plane/blocks/empty-state";
import { useTranslation } from "@plane/i18n";

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="h-screen w-screen bg-surface-1 p-4">
      <EmptyStateDetailed
        align="center"
        assetKey="error-404"
        assetClassName="size-40"
        title={t("workspace_settings.settings.general.delete_modal.error_title")}
        description="Check the URL you are entering in the browser's address bar and try again."
      />
    </div>
  );
}

export default NotFound;
