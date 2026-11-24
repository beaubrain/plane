/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Tooltip } from "@makeplane/propel/components/tooltip";
import { usePlatformOS } from "@/hooks/use-platform-os";
import packageJson from "package.json";

export function WorkspaceEditionBadge() {
  const { isMobile } = usePlatformOS();

  return (
    <Tooltip label={`Version: v${packageJson.version}`} disabled={isMobile}>
      <span className="text-body-xs-medium text-secondary">Community</span>
    </Tooltip>
  );
}
