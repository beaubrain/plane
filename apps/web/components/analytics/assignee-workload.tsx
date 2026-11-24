/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@makeplane/propel/components/button";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import { Spinner } from "@plane/blocks/spinner";
import { useTranslation } from "@plane/i18n";
import type { TAssigneeWorkloadQuery } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
import { useAnalytics } from "@/hooks/store/use-analytics";
import { AnalyticsService } from "@/services/analytics.service";
import AnalyticsWrapper from "./analytics-wrapper";

const analyticsService = new AnalyticsService();
const workloadKey = "workspace_analytics.assignee_workload";

type AssignedTasksProps = {
  workspaceSlug: string;
  params: TAssigneeWorkloadQuery;
  assigneeId: string;
  displayName: string;
  formatHours: (value: string | null) => string;
};

function AssignedTasks({ workspaceSlug, params, assigneeId, displayName, formatHours }: AssignedTasksProps) {
  const { t, currentLocale } = useTranslation();
  const [cursor, setCursor] = useState<string>();
  const { data, error, isLoading } = useSWR(
    ["assigned-workload-tasks", workspaceSlug, params, assigneeId, cursor],
    () => analyticsService.getAssignedWorkloadTasks(workspaceSlug, params, assigneeId, cursor)
  );
  const dates = new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-2 border-t border-subtle pt-3">
      <h3 className="text-body-sm-semibold text-primary">{displayName}</h3>
      {isLoading && <Spinner />}
      {error && <p role="alert">{t("common.error.label")}</p>}
      {data && data.results.length === 0 && <p>{t(`${workloadKey}.empty`)}</p>}
      {data && data.results.length > 0 && (
        <>
          <ul className="divide-y divide-subtle">
            {data.results.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link
                  href={generateWorkItemLink({
                    workspaceSlug,
                    projectId: task.project_id,
                    issueId: task.id,
                    projectIdentifier: task.project_identifier,
                    sequenceId: task.sequence_id,
                  })}
                  className="min-w-0 break-words text-accent-primary hover:underline"
                >
                  {task.project_identifier}-{task.sequence_id} {task.name}
                </Link>
                <div className="flex flex-wrap items-center gap-3 text-secondary">
                  <span>
                    {task.state_name?.trim().toLowerCase() === "todo" ? t(`${workloadKey}.work_date`) : task.state_name}
                  </span>
                  {(task.start_date || task.target_date) && (
                    <span>
                      {[task.start_date, task.target_date]
                        .flatMap((date) => (date ? [dates.format(new Date(date))] : []))
                        .join(" – ")}
                    </span>
                  )}
                  <span className="text-right tabular-nums">{formatHours(task.allocated_hours)}</span>
                </div>
              </li>
            ))}
          </ul>
          {(data.prev_page_results || data.next_page_results) && (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                stretch="auto"
                disabled={!data.prev_page_results}
                onClick={() => setCursor(data.prev_cursor)}
                label={t("prev")}
              />
              <Button
                variant="secondary"
                size="sm"
                stretch="auto"
                disabled={!data.next_page_results}
                onClick={() => setCursor(data.next_cursor)}
                label={t("next")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const AssigneeWorkload = observer(function AssigneeWorkload() {
  const { t, currentLocale } = useTranslation();
  const { workspaceSlug: slug } = useParams();
  const workspaceSlug = slug.toString();
  const { selectedProjects } = useAnalytics();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  const params: TAssigneeWorkloadQuery = {
    project_ids: selectedProjects.length ? selectedProjects.join(",") : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };
  const { data, error, isLoading } = useSWR(invalidRange ? null : ["assignee-workload", workspaceSlug, params], () =>
    analyticsService.getAssigneeWorkload(workspaceSlug, params)
  );
  const selectedAssignee = data?.find((row) => row.assignee_id === assigneeId);
  const hours = new Intl.NumberFormat(currentLocale, { style: "unit", unit: "hour", maximumFractionDigits: 2 });
  const formatHours = (value: string | null) => (value === null ? "—" : hours.format(Number(value)));

  return (
    <AnalyticsWrapper i18nTitle={`${workloadKey}.title`}>
      <div className="flex flex-col gap-3 text-body-sm-regular">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span>{t("start_date")}</span>
            <InputGroup size="md">
              <Input type="date" size="md" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </InputGroup>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t("end_date")}</span>
            <InputGroup size="md">
              <Input type="date" size="md" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </InputGroup>
          </label>
          <Button
            variant="secondary"
            size="sm"
            stretch="auto"
            disabled={!startDate && !endDate}
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            label={t("common.clear")}
          />
        </div>
        {invalidRange && <p role="alert">{t(`${workloadKey}.invalid_range`)}</p>}
        {isLoading && <Spinner />}
        {error && <p role="alert">{t("common.error.label")}</p>}
        {data && data.length === 0 && <p>{t(`${workloadKey}.empty`)}</p>}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-subtle text-secondary">
                <tr>
                  <th scope="col" className="py-2 text-left">
                    {t("common.assignee")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {t(`${workloadKey}.assigned_tasks`)}
                  </th>
                  <th scope="col" className="py-2 text-right">
                    {t(`${workloadKey}.allocated_hours`)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {data.map((row) => (
                  <tr key={row.assignee_id}>
                    <th scope="row" className="font-normal py-2 text-left">
                      <button
                        type="button"
                        className="text-left text-accent-primary hover:underline"
                        aria-expanded={row.assignee_id === selectedAssignee?.assignee_id}
                        onClick={() => setAssigneeId(assigneeId === row.assignee_id ? null : row.assignee_id)}
                      >
                        {row.display_name}
                      </button>
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.task_count.toLocaleString(currentLocale)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatHours(row.allocated_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selectedAssignee && (
          <AssignedTasks
            key={JSON.stringify([workspaceSlug, params, selectedAssignee.assignee_id])}
            workspaceSlug={workspaceSlug}
            params={params}
            assigneeId={selectedAssignee.assignee_id}
            displayName={selectedAssignee.display_name}
            formatHours={formatHours}
          />
        )}
      </div>
    </AnalyticsWrapper>
  );
});
