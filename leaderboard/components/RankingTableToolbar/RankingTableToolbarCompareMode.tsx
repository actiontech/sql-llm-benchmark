import React from 'react';
import { Button, Badge } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';

interface RankingTableToolbarCompareModeProps {
  t: TFunction;
  selectedCount: number;
  onExitCompare: () => void;
  onStartCompare: () => void;
}

export const RankingTableToolbarCompareMode: React.FC<
  RankingTableToolbarCompareModeProps
> = ({ t, selectedCount, onExitCompare, onStartCompare }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div
      className="flex items-center rounded-md border border-[#91caff] bg-[#f0f9ff] px-3 py-1.5 max-md:min-h-[44px]"
      style={{ minHeight: 32 }}
    >
      <Badge
        count={selectedCount}
        showZero
        style={{ backgroundColor: '#1890ff' }}
      />
      <span className="ml-2 text-sm font-bold text-[#1890ff]">
        {t('compare.selected_models_count', { count: selectedCount })}
      </span>
      {/* 移动端：退出对比 X 图标 */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onExitCompare();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExitCompare();
          }
        }}
        className="ml-2 flex cursor-pointer items-center text-[#1890ff] hover:text-[#40a9ff] md:hidden!"
        aria-label={t('compare.exit_compare_mode')}
      >
        <CloseOutlined style={{ fontSize: 14 }} />
      </span>
    </div>
    {selectedCount >= 2 && (
      <Button
        type="primary"
        onClick={onStartCompare}
      >
        {t('compare.start_compare', { count: selectedCount })}
      </Button>
    )}
  </div>
);
