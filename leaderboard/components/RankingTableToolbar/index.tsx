import React from 'react';
import { RankingTableToolbarDesktop } from './RankingTableToolbarDesktop';
import { RankingTableToolbarMobile } from './RankingTableToolbarMobile';
import { RankingTableToolbarCompareMode } from './RankingTableToolbarCompareMode';
import type { TFunction } from 'i18next';

export interface RankingTableToolbarProps {
  months: string[];
  currentMonth: string;
  latestMonth: string;
  isLatestMonthCurrent: boolean;
  t: TFunction;
  showCompareMode: boolean;
  selectedModelsCount: number;
  onMonthChange: (month: string) => void;
  onFormulaClick: () => void;
  onContributeClick: () => void;
  onToggleCompareMode: () => void;
  onReload: () => void;
  onStartCompare: () => void;
}

export const RankingTableToolbar: React.FC<RankingTableToolbarProps> = ({
  months,
  currentMonth,
  latestMonth,
  isLatestMonthCurrent,
  t,
  showCompareMode,
  selectedModelsCount,
  onMonthChange,
  onFormulaClick,
  onContributeClick,
  onToggleCompareMode,
  onReload,
  onStartCompare,
}) => (
  <div className="flex flex-col gap-3 max-md:gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2">
    <RankingTableToolbarDesktop
      months={months}
      currentMonth={currentMonth}
      latestMonth={latestMonth}
      isLatestMonthCurrent={isLatestMonthCurrent}
      t={t}
      showCompareMode={showCompareMode}
      onMonthChange={onMonthChange}
      onFormulaClick={onFormulaClick}
      onContributeClick={onContributeClick}
      onToggleCompareMode={onToggleCompareMode}
    />

    <RankingTableToolbarMobile
      months={months}
      currentMonth={currentMonth}
      latestMonth={latestMonth}
      isLatestMonthCurrent={isLatestMonthCurrent}
      t={t}
      onMonthChange={onMonthChange}
      onFormulaClick={onFormulaClick}
      onContributeClick={onContributeClick}
      onToggleCompareMode={onToggleCompareMode}
      onReload={onReload}
    />

    {showCompareMode && (
      <RankingTableToolbarCompareMode
        t={t}
        selectedCount={selectedModelsCount}
        onExitCompare={onToggleCompareMode}
        onStartCompare={onStartCompare}
      />
    )}
  </div>
);
