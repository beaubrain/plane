/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Link } from "react-router";
// plane imports
import { Button } from "@makeplane/propel/components/button";
import { EmptyStateDetailed } from "@plane/blocks/empty-state";
import { useTranslation } from "@plane/i18n";

function PageNotFound() {
  const { t } = useTranslation();
  return (
    <div className="h-screen w-full overflow-hidden bg-surface-1 p-4">
      <EmptyStateDetailed
        align="center"
        assetKey="error-404"
        assetClassName="size-40"
        title={t("common.something_went_wrong")}
        description="Sorry, the page you are looking for cannot be found. It may have been removed, had its name changed, or is temporarily unavailable."
        customButton={
          <Button
            variant="primary"
            size="lg"
            stretch="auto"
            nativeButton={false}
            render={<Link to="/general/" />}
            label="Go to general settings"
          />
        }
      />
    </div>
  );
}

export default PageNotFound;
