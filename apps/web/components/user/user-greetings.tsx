/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane types
import { SEOUL_TIME_ZONE, renderFormattedTime } from "@plane/utils";
import { useTranslation } from "@plane/i18n";
// hooks
import type { IUser } from "@plane/types";
import { useCurrentTime } from "@/hooks/use-current-time";
// types

export interface IUserGreetingsView {
  user: IUser;
}

export function UserGreetingsView(props: IUserGreetingsView) {
  const { user } = props;
  // current time hook
  const { currentTime } = useCurrentTime();
  // store hooks
  const { t, currentLocale } = useTranslation();
  const locale = currentLocale === "ua" ? "uk" : currentLocale;
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: SEOUL_TIME_ZONE,
      hourCycle: "h23",
      hour: "numeric",
    }).format(currentTime)
  );
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: SEOUL_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(currentTime);
  const timeString = renderFormattedTime(currentTime);

  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return (
    <div className="my-6 flex flex-col items-center">
      <h2 className="text-center text-h4-semibold">
        {t("good")} {t(greeting)}, {user?.display_name}
      </h2>
      <h5 className="flex items-center gap-2 font-medium text-placeholder">
        <div>{greeting === "morning" ? "🌤️" : greeting === "afternoon" ? "🌥️" : "🌙️"}</div>
        <div>
          {date} {timeString}
        </div>
      </h5>
    </div>
  );
}
