import React from 'react';
import { Button, Select, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  FormOutlined,
  GithubOutlined,
  SwapOutlined,
  EllipsisOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { TFunction } from 'i18next';

interface RankingTableToolbarMobileProps {
  months: string[];
  currentMonth: string;
  latestMonth: string;
  isLatestMonthCurrent: boolean;
  t: TFunction;
  onMonthChange: (month: string) => void;
  onFormulaClick: () => void;
  onContributeClick: () => void;
  onToggleCompareMode: () => void;
  onReload: () => void;
}

export const RankingTableToolbarMobile: React.FC<RankingTableToolbarMobileProps> = ({
  months,
  currentMonth,
  latestMonth,
  isLatestMonthCurrent,
  t,
  onMonthChange,
  onFormulaClick,
  onContributeClick,
  onToggleCompareMode,
  onReload,
}) => (
  <div className="flex w-[84vw] flex-nowrap justify-between items-center md:hidden">
    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
      <Select
        value={currentMonth}
        onChange={onMonthChange}
        className="min-w-[140px]! flex-1"
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

      <Dropdown
        menu={{
          items: [
            {
              key: 'formula',
              icon: <FormOutlined />,
              label: t('evaluation_cases.formula_button'),
              onClick: onFormulaClick,
            },
            {
              key: 'contribute',
              icon: <GithubOutlined />,
              label: t('nav.contribute_evaluation'),
              onClick: onContributeClick,
            },
          ] as MenuProps['items'],
        }}
        trigger={['click']}
      >
        <Button icon={<EllipsisOutlined />} className="rounded-lg! mr-4">
          {t('ranking.toolbar_more')}
        </Button>
      </Dropdown>
    </div>

    <Button
      icon={<ReloadOutlined />}
      onClick={onReload}
      className="shrink-0 rounded-lg!"
      aria-label={t('actions.reload')}
    />
  </div>
);
