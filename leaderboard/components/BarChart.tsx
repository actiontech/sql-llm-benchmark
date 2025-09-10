import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from 'antd';
import { useChartExport } from '../lib/chartExport';
import { INDICATOR_KEYS } from './constants';
import { useTranslation } from 'react-i18next';
import type { EChartsOption } from 'echarts'; // 导入 EChartsOption 类型

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface BarChartProps {
  data: {
    indicator_actual_score: number;
    indicator_name: string;
  }[];
  onIndicatorClick?: (indicator: string) => void;
}

export const BarChart: React.FC<BarChartProps> = ({ data, onIndicatorClick }) => {
  const { t } = useTranslation();
  const chartRef = useRef<any>(null);
  const { exportImage } = useChartExport(chartRef);

  const categories = data.map((item) => t(`indicator.${item.indicator_name}`));
  const values = data.map((item) => item.indicator_actual_score);

  const option = {
    tooltip: {},
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0, // 强制显示所有标签
        rotate: 30,  // 旋转标签，避免重叠
      },
    },
    yAxis: { type: 'value', max: 100 },
    series: [
      {
        type: 'bar',
        data: values,
        label: { show: true, position: 'top', formatter: '{c}' },
      },
    ],
  };

  // 处理图表点击事件
  const handleChartClick = (params: any) => {
    if (onIndicatorClick && params.componentType === 'series') {
      const indicatorIndex = params.dataIndex;
      const indicatorName = data[indicatorIndex]?.indicator_name;
      if (indicatorName) {
        onIndicatorClick(indicatorName);
      }
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <Button onClick={() => exportImage('bar-chart.png')}>
          {t('actions.export')}
        </Button>
      </div>
      <ReactECharts
        option={option}
        onChartReady={(inst) => (chartRef.current = inst)}
        style={{ width: '100%', height: 400 }}
        onEvents={{
          click: handleChartClick,
        }}
      />
    </div>
  );
};
