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
        <div
            style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                gap: "20px",
                width: "100%",
                marginTop: "auto",
            }}
        >
            {[
                "sql_optimization",
                "dialect_conversion",
                "sql_understanding",
            ].map((category) => {
                const model = topModelsByCategory[category];

                return (
                  <div
                    key={category}
                    style={{
                      width: '30%',
                      minWidth: 220,
                      height: 350,
                      transition: 'transform 0.3s ease',
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 12px 16px rgba(255, 215, 0, 0.4))', // 适配不规则图形的阴影
                    }}
                    onClick={() => {
                      if (model) {
                        onCategoryClick(category);
                      }
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = 'translateY(-10px)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = 'translateY(0)')
                    }
                  >
                    <Card
                      variant="borderless"
                      style={{
                        width: '100%',
                        height: '100%',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // 核心：使用clip-path定义徽章形状
                        clipPath:
                          'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)',
                      }}
                      styles={{
                        body: {
                          padding: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          width: '100%',
                        },
                      }}
                    >
                      <Space align="center" style={{ marginBottom: '12px' }}>
                        <Title
                          level={3}
                          style={{
                            margin: 0,
                            color: '#333',
                            fontSize: '18px',
                          }}
                        >
                          {t(`table.${category}`)}
                        </Title>
                        <TrophyFilled
                          style={{ color: '#FFD700', fontSize: '32px' }}
                        />
                      </Space>
                      {model ? (
                        <Space
                          direction="vertical"
                          size="large"
                          style={{
                            width: '100%',
                            flexGrow: 1,
                            justifyContent: 'center',
                          }}
                        >
                          {model.organization && (
                            <LogoImage
                              organization={model.organization}
                              logoInfo={logoInfo}
                              modelLogoInfo={modelLogoInfo}
                              width={90}
                              height={90}
                              style={{
                                borderRadius: '50%',
                                border: '4px solid #FFD700',
                                padding: '4px',
                                background: 'white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                display: 'block',
                                margin: '0 auto',
                              }}
                            />
                          )}
                          <Title level={4} style={{ margin: 0, color: '#222' }}>
                            {model.real_model_namne}
                          </Title>
                          <Paragraph
                            strong
                            style={{
                              fontSize: '32px',
                              color: '#1890ff',
                              fontWeight: 'bold',
                              margin: 0,
                            }}
                          >
                            {model.scores?.[category]?.ability_score?.toFixed(
                              2
                            ) ?? 'N/A'}
                          </Paragraph>
                        </Space>
                      ) : (
                        <Paragraph style={{ color: '#666' }}>
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