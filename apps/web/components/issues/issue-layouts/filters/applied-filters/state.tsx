/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { getStateDisplayName } from "@plane/utils";
import { useTranslation } from "@plane/i18n";
import { observer } from "mobx-react";
// icons
// plane imports
import { EIconSize } from "@plane/constants";
import { StateGroupIcon } from "@plane/blocks/icons";
import type { IState } from "@plane/types";
import { RemovableChip } from "@/components/common/removable-chip";

type Props = {
  handleRemove: (val: string) => void;
  states: IState[];
  values: string[];
  editable: boolean | undefined;
};

export const AppliedStateFilters = observer(function AppliedStateFilters(props: Props) {
  const { t } = useTranslation();
  const { handleRemove, states, values, editable } = props;

  return (
    <>
      {values.map((stateId) => {
        const stateDetails = states?.find((s) => s.id === stateId);

        if (!stateDetails) return null;
        const stateName = getStateDisplayName(stateDetails.name, t, stateDetails.group);

        return (
          <RemovableChip
            key={stateId}
            variant="soft"
            icon={
              <StateGroupIcon
                color={stateDetails.color}
                stateGroup={stateDetails.group}
                size={EIconSize.SM}
                percentage={stateDetails?.order}
              />
            }
            label={stateName}
            ariaLabel={stateName}
            onRemove={editable ? () => handleRemove(stateId) : undefined}
          />
        );
      })}
    </>
  );
});
