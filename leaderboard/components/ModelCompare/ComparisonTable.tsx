import React, { useMemo } from 'react';
import { Table, Tag, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Model } from '../../types/ranking';
import { LogoImage } from '../LogoImage';
import { getModelTypeText } from '../../utils/modelTypeUtils';

interface ComparisonTableProps {
    models: Model[];
    colorPalette: string[];
    logoInfo: Record<string, string>;
    t: (key: string, options?: any) => string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
    models,
    colorPalette,
    logoInfo,
    t,
}) => {
    // 构建表格数据
    const tableData = useMemo(() => {
        const data: any[] = [];

        // 维度数据
        const capabilities = [
            { key: 'sql_optimization', name: 'SQL优化' },
            { key: 'dialect_conversion', name: '方言转换' },
            { key: 'sql_understanding', name: 'SQL理解' },
        ];

        capabilities.forEach(capability => {
            // 添加维度行
            const capabilityRow = {
                key: capability.key,
                category: capability.name,
                type: 'capability',
                ...models.reduce((acc, model) => ({
                    ...acc,
                    [model.id]: model.scores?.[capability.key]?.ability_score || 0,
                }), {}),
            };
            data.push(capabilityRow);

            // 从所有模型中收集该维度的所有指标
            const allIndicators = new Set<string>();
            models.forEach(model => {
                const modelIndicators = model.scores?.[capability.key]?.indicator_score || [];
                modelIndicators.forEach(indicator => {
                    allIndicators.add(indicator.indicator_name);
                });
            });

            // 添加该维度下的指标行
            Array.from(allIndicators).forEach(indicatorName => {
                const indicatorRow = {
                    key: `${capability.key}_${indicatorName}`,
                    category: `　　${t ? t(`indicator.${indicatorName}`) : indicatorName}`,
                    type: 'indicator',
                    ...models.reduce((acc, model) => {
                        const modelIndicator = model.scores?.[capability.key]?.indicator_score?.find(
                            item => item.indicator_name === indicatorName
                        );
                        return {
                            ...acc,
                            [model.id]: modelIndicator?.indicator_actual_score || 0,
                        };
                    }, {}),
                };
                data.push(indicatorRow);
            });
        });

        return data;
    }, [models, t]);

    const columns = useMemo(() => {
        const baseColumns = [
            {
                title: t("compare.evaluation_item"),
                dataIndex: 'category',
                key: 'category',
                fixed: 'left' as const,
                width: 200,
                render: (text: string, record: any) => (
                    <span
                        style={{
                            fontWeight: record.type === 'capability' ? 'bold' : 'normal',
                            color: record.type === 'capability' ? '#1890ff' : '#666',
                        }}
                    >
                        {text}
                    </span>
                ),
            },
        ];

        const modelColumns = models.map((model, index) => ({
            title: (
                <div style={{ textAlign: 'center' }}>
                    <LogoImage
                        organization={model.organization}
                        logoInfo={logoInfo}
                        width={54}
                        height={24}
                        style={{ marginBottom: '2px' }}
                    />
                    <div style={{ fontSize: '15px' }}>{model.real_model_namne}</div>
                    <Tag color={colorPalette[index]}>
                        {getModelTypeText(model.type, t)}
                    </Tag>
                </div>
            ),
            dataIndex: model.id,
            key: model.id,
            width: 120,
            align: 'center' as const,
            render: (score: number, record: any) => (
                <span
                    style={{
                        fontWeight: record.type === 'capability' ? 'bold' : 'normal',
                        color: record.type === 'capability' ? '#1890ff' : '#333',
                        fontSize: record.type === 'capability' ? '16px' : '14px',
                    }}
                >
                    {score?.toFixed(1) || '--'}
                </span>
            ),
        }));

        return [...baseColumns, ...modelColumns];
    }, [models, colorPalette, t]);

    const handleExport = () => {
        // 导出CSV功能
        const csvContent = [
            // 表头 - 使用国际化
            [t ? t('compare.evaluation_item') : '评测项目', ...models.map(m => m.real_model_namne)].join(','),
            // 数据行
            ...tableData.map(row => [
                row.category.replace(/　　/g, '  '), // 替换全角空格为两个半角空格
                ...models.map(model => row[model.id] || '--')
            ].join(','))
        ].join('\n');

        // 添加UTF-8 BOM以解决中文乱码问题
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${t ? t('compare.model_comparison_data') : '模型对比数据'}_${new Date().toLocaleDateString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                >
                    {t("compare.export_data")}
                </Button>
            </div>
            <Table
                columns={columns}
                dataSource={tableData}
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="middle"
                bordered
                rowClassName={(record) =>
                    record.type === 'capability' ? 'capability-row' : 'indicator-row'
                }
                style={{
                    backgroundColor: '#fff',
                }}
            />
            <style jsx>{`
        :global(.capability-row) {
          background-color: #f0f7ff !important;
        }
        :global(.indicator-row) {
          background-color: #fafafa;
        }
        :global(.capability-row:hover) {
          background-color: #e6f4ff !important;
        }
        :global(.indicator-row:hover) {
          background-color: #f5f5f5 !important;
        }
      `}</style>
        </div>
    );
}; 