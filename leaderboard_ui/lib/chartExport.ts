import { RefObject } from 'react';
import { EChartsType } from 'echarts';

export function useChartExport(ref: RefObject<EChartsType | null>) {
  const exportImage = (filename = 'chart.png') => {
    const inst = ref.current;
    if (!inst) return;
    const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };
  return { exportImage };
}
