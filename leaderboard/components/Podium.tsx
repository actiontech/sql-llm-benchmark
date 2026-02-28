import React from "react";
import { Card, Space, Typography } from "antd";
import { TrophyFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { LogoImage } from "./LogoImage";
import { Model } from "../types/ranking";

const { Title, Paragraph } = Typography;

interface PodiumProps {
  topModelsByCategory: Record<string, Model | null>;
  logoInfo: Record<string, string>;
  modelLogoInfo?: Record<string, { ext: string; originalName: string }>;
  onCategoryClick: (category: string) => void;
}

export const Podium: React.FC<PodiumProps> = ({
  topModelsByCategory,
  logoInfo,
  modelLogoInfo = {},
  onCategoryClick
}) => {
  const { t } = useTranslation("common");

  return (
    <div className="mt-auto flex w-full items-center justify-around gap-2 md:gap-5">
      {[
        "sql_optimization",
        "dialect_conversion",
        "sql_understanding",
      ].map((category) => {
        const model = topModelsByCategory[category];

        return (
          <div
            key={category}
            className="h-[280px] w-[30%] min-w-0 cursor-pointer transition-all duration-300 ease-in-out drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:-translate-y-2.5 md:h-[350px] md:min-w-[220px] md:drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
            onClick={() => {
              if (model) {
                onCategoryClick(category);
              }
            }}
          >
            <Card
              variant="borderless"
              className="flex h-full w-full flex-col items-center justify-center border border-[rgba(245,222,179,0.3)] bg-[linear-gradient(180deg,rgba(255,253,245,0.9)_0%,rgba(255,250,240,0.85)_100%)]! text-center backdrop-blur-[10px] [clip-path:polygon(0%_0%,100%_0%,100%_85%,50%_100%,0%_85%)]"
              classNames={{
                body: 'flex h-full w-full flex-col items-center p-0!',
              }}
            >
              {/* 头部表头区域 */}
              <div
                className="w-full  border-b-2 border-black/8 bg-[linear-gradient(180deg,#FAF0E6_0%,#F5DEB3_100%)] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:p-4"
              >
                <Space align="center" className="w-full justify-center">
                  <Title
                    level={3}
                    className="m-0! text-[#333] text-[14px]! md:text-[18px]!"
                  >
                    {t(`table.${category}`)}
                  </Title>
                  <TrophyFilled className="text-[#FFD700]! text-[24px] md:text-[32px]!"
                  />
                </Space>
              </div>

              {/* 主体内容区域 */}
              {model ? (
                <Space
                  direction="vertical"
                  size="small"
                  className="w-full grow justify-center md:gap-6!"
                >
                  <div className="h-30">
                    {model.organization && (
                      <LogoImage
                        organization={model.organization}
                        logoInfo={logoInfo}
                        modelLogoInfo={modelLogoInfo}
                        width={90}
                        height={90}
                        className="mx-auto block size-[50px]! rounded-full border-2 border-[#FFD700] bg-white p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] md:size-[90px] md:border-4 md:p-1"
                      />
                    )}
                    <Title level={4} className="m-0 text-[#222] text-sm md:text-base">
                      {model.real_model_namne}
                    </Title>
                  </div>
                  <Paragraph strong className="m-0 text-[24px]! font-bold text-[#1890ff]! md:text-[32px]!">
                    {model.scores?.[category]?.ability_score?.toFixed(
                      2
                    ) ?? 'N/A'}
                  </Paragraph>
                </Space>
              ) : (
                  <Paragraph className="text-[#666]">
                  {t('table.no_data')}
                </Paragraph>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}; 