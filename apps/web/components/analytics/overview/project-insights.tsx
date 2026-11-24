/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { lazy, Suspense } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane package imports
import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/blocks/empty-state";
import type { TChartData } from "@plane/types";
import { cn } from "@plane/utils";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
// services
import { AnalyticsService } from "@/services/analytics.service";
// plane web components
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { ANALYTICS_CHART_HEIGHT_CLASSNAME } from "../constants";
import { ProjectInsightsLoader } from "../loaders";

const RadarChart = lazy(function RadarChart() {
  return import("@plane/blocks/charts/radar-chart").then((mod) => ({
    default: mod.RadarChart,
  }));
});

const analyticsService = new AnalyticsService();

const projectInsightLabels: Partial<Record<string, string>> = {
  work_items: "sidebar.work_items",
  cycles: "sidebar.cycles",
  modules: "sidebar.modules",
  intake: "sidebar.intake",
  members: "common.members",
  pages: "sidebar.pages",
  views: "sidebar.views",
};

const ProjectInsights = observer(function ProjectInsights() {
  const params = useParams();
  const { t } = useTranslation();
  const workspaceSlug = params.workspaceSlug.toString();
  const { selectedDuration, selectedDurationLabel, selectedProjects, selectedCycle, selectedModule, isPeekView } =
    useAnalytics();

  const { data: projectInsightsData, isLoading: isLoadingProjectInsight } = useSWR(
    `radar-chart-project-insights-${workspaceSlug}-${selectedDuration}-${selectedProjects}-${selectedCycle}-${selectedModule}-${isPeekView}`,
    () =>
      analyticsService.getAdvanceAnalyticsCharts<TChartData<string, string>[]>(
        workspaceSlug,
        "projects",
        {
          // date_filter: selectedDuration,
          ...(selectedProjects?.length > 0 && { project_ids: selectedProjects?.join(",") }),
          ...(selectedCycle ? { cycle_id: selectedCycle } : {}),
          ...(selectedModule ? { module_id: selectedModule } : {}),
        },
        isPeekView
      )
  );
  const chartData = projectInsightsData?.map((item) => {
    const label = projectInsightLabels[item.key];
    return label ? { ...item, name: t(label) } : item;
  });

  return (
    <AnalyticsSectionWrapper
      title={`${t("workspace_analytics.project_insights")}`}
      subtitle={selectedDurationLabel}
      className="lg:col-span-3"
    >
      {isLoadingProjectInsight ? (
        <ProjectInsightsLoader />
      ) : projectInsightsData && projectInsightsData?.length == 0 ? (
        <EmptyStateCompact
          assetKey="unknown"
          assetClassName="size-20"
          rootClassName="border border-subtle px-5 py-10 md:py-20 md:px-20"
          title={t("workspace_empty_state.analytics_work_items.title")}
        />
      ) : (
        <div className="gap-8 xl:flex">
          {chartData && (
            <Suspense fallback={<ProjectInsightsLoader />}>
              <RadarChart
                className={cn(ANALYTICS_CHART_HEIGHT_CLASSNAME, "w-full text-accent-primary xl:w-3/5")}
                data={chartData}
                dataKey="key"
                radars={[
                  {
                    key: "count",
                    name: t("workspace_analytics.count"),
                    fill: "var(--text-color-accent-primary)",
                    stroke: "var(--text-color-accent-primary)",
                    fillOpacity: 0.6,
                    dot: {
                      r: 4,
                      fillOpacity: 1,
                    },
                  },
                ]}
                margin={{ top: 0, right: 40, bottom: 10, left: 40 }}
                showTooltip
                angleAxis={{
                  key: "name",
                }}
              />
            </Suspense>
          )}
          <div className="w-full xl:w-2/5">
            <div className="text-body-xs-regular text-tertiary">{t("workspace_analytics.summary_of_projects")}</div>
            <div className="mb-3 border-b border-subtle py-2">{t("workspace_analytics.all_projects")}</div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-body-xs-regular text-tertiary">
                <div>{t("workspace_analytics.trend_on_charts")}</div>
                <div>{t("common.work_items")}</div>
              </div>
              {chartData?.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-body-xs-regular text-primary">
                  <div>{item.name}</div>
                  <div className="flex items-center gap-1">
                    {/* <TrendPiece key={item.key} size='xs' /> */}
                    <div className="text-secondary">{item.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AnalyticsSectionWrapper>
  );
});

export default ProjectInsights;
