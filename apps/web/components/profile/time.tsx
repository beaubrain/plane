/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// hooks
import { SEOUL_TIME_ZONE, renderFormattedTime } from "@plane/utils";
import { useCurrentTime } from "@/hooks/use-current-time";

export function ProfileSidebarTime() {
  // current time hook
  const { currentTime } = useCurrentTime();

  return (
    <span>
      {renderFormattedTime(currentTime)} <span className="text-secondary">{SEOUL_TIME_ZONE}</span>
    </span>
  );
}
