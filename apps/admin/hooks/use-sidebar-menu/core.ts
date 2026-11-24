/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import {
  AiStarFourOutline,
  ImageOutline,
  LockOutline,
  MailOutline,
  SettingsOutline,
  WorkspaceOutline,
} from "@makeplane/propel/icons";
// types
import type { TSidebarMenuItem } from "./types";

export type TCoreSidebarMenuKey = "general" | "email" | "workspace" | "authentication" | "ai" | "image";

export const coreSidebarMenuLinks: Record<TCoreSidebarMenuKey, TSidebarMenuItem> = {
  general: {
    Icon: SettingsOutline,
    nameKey: "common.general",
    href: `/general/`,
  },
  email: {
    Icon: MailOutline,
    nameKey: "email",
    href: `/email/`,
  },
  workspace: {
    Icon: WorkspaceOutline,
    nameKey: "common.workspaces",
    href: `/workspace/`,
  },
  authentication: {
    Icon: LockOutline,
    nameKey: "workspace_settings.settings.members.details.authentication",
    href: `/authentication/`,
  },
  ai: {
    Icon: AiStarFourOutline,
    nameKey: "pi_chat",
    href: `/ai/`,
  },
  image: {
    Icon: ImageOutline,
    nameKey: "navigation_ui.images",
    href: `/image/`,
  },
};
