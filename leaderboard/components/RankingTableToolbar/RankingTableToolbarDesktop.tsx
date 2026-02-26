import React from 'react';
import { Button, Select } from 'antd';
import { FormOutlined, GithubOutlined, SwapOutlined, CloseOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';

interface RankingTableToolbarDesktopProps {
  months: string[];
  currentMonth: string;
  latestMonth: string;
  isLatestMonthCurrent: boolean;
  t: TFunction;
  showCompareMode: boolean;
  onMonthChange: (month: string) => void;
  onFormulaClick: () => void;
  onContributeClick: () => void;
  onToggleCompareMode: () => void;
}

export const RankingTableToolbarDesktop: React.FC<RankingTableToolbarDesktopProps> = ({
  months,
  currentMonth,
  latestMonth,
  isLatestMonthCurrent,
  t,
  showCompareMode,
  onMonthChange,
  onFormulaClick,
  onContributeClick,
  onToggleCompareMode,
}) => (
  <div className="hidden md:flex flex-wrap items-center gap-2">
    <Select
      value={currentMonth}
      onChange={onMonthChange}
      className="min-w-[180px]!"
      size="middle"
    >
      {months.map((m) => {
        const isLatestMonth = m === latestMonth;
        const isRealTime = isLatestMonth && isLatestMonthCurrent;
        return (
          <Select.Option key={m} value={m}>
            {isRealTime ? t('ranking.current_month_realtime') : m}
          </Select.Option>
        );
      })}
    </Select>

    <Button type="text" icon={<FormOutlined />} onClick={onFormulaClick}>
      {t('evaluation_cases.formula_button')}
    </Button>
    <Button type="text" icon={<GithubOutlined />} onClick={onContributeClick}>
      {t('nav.contribute_evaluation')}
    </Button>
    <div
      className="block"
      style={{
        width: 1,
        height: 24,
        background: '#d9d9d9',
        margin: '0 8px',
      }}
    />
    <Button
      type={showCompareMode ? 'default' : 'primary'}
      onClick={onToggleCompareMode}
      icon={showCompareMode ? <CloseOutlined /> : <SwapOutlined />}
    >
      {showCompareMode
        ? t('compare.exit_compare_mode')
        : t('compare.toggle_compare_mode')}
    </Button>
  </div>
);
