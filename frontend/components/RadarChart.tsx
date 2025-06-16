// components/RadarChart.tsx
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "antd";
import { useChartExport } from "../lib/chartExport";
import type { EChartsOption } from "echarts";
import { useTranslation } from "react-i18next";

// 动态加载 ECharts 组件，禁用 SSR
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface RadarChartProps {
  scores: Record<
    string,
    {
      ability_score: number;
      indicator_score: {
        indicator_actual_score: number;
        indicator_name: string;
      }[];
    }
  >;
}

/**
 * 雷达图组件，包含“导出”按钮
 */
export const RadarChart: React.FC<RadarChartProps> = ({ scores }) => {
  const { t } = useTranslation();
  const chartRef = useRef<any>(null);
  const { exportImage } = useChartExport(chartRef);

  // 构造雷达图的 indicator 和数据值
  const indicators = Object.keys(scores).map((key) => ({
    name: t(`table.${key}`),
    max: 100, // 雷达图的最大值，可以根据实际数据调整
  }));
  const values = Object.values(scores).map((score) => score.ability_score);

  const option: EChartsOption = {
    tooltip: {},
    radar: {
      shape: "circle",
      splitNumber: 5,
      indicator: indicators,
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: t("table.model_score"), // Add a name for the series, useful for tooltip/legend
            itemStyle: {
              color: "#5470C6", // Set point color
            },
            lineStyle: {
              color: "#5470C6", // Set line color
            },
            areaStyle: {
              opacity: 0.6, // Set fill area opacity
            },
          },
        ],
      },
    ],
  };

  return (
    <div>
      {/* “导出”按钮 */}
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <Button onClick={() => exportImage("radar-chart.png")}>
          {t("actions.export")}
        </Button>
      </div>
      {/* 渲染雷达图，并在 onChartReady 拿到实例 */}
      <ReactECharts
        option={option}
        style={{ width: "100%", height: 400 }}
        onChartReady={(inst) => {
          chartRef.current = inst;
        }}
      />
    </div>
  );
};
