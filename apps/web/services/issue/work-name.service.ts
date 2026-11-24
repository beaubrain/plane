/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TPaginatedResponse } from "@plane/types";
import { APIService } from "@/services/api.service";

export type WorkName = { name: string };

export class WorkNameService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async list(
    workspaceSlug: string,
    projectId: string,
    params: { cursor?: string; search?: string }
  ): Promise<TPaginatedResponse<WorkName[]>> {
    const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-names/`, { params });
    return response.data;
  }

  async create(workspaceSlug: string, projectId: string, name: string): Promise<WorkName> {
    const response = await this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-names/`, { name });
    return response.data;
  }
}
