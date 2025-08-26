import React from "react";
import { Card, Typography, Descriptions } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Model } from "../types/ranking";

const { Title, Paragraph } = Typography;

interface ModelDetailCardProps {
    model: Model;
}

export const ModelDetailCard: React.FC<ModelDetailCardProps> = ({ model }) => {
    const { t } = useTranslation("common");

    return (
        <Card
            bordered={false}
            style={{
                borderRadius: 12,
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
                marginBottom: "32px",
                background: "linear-gradient(135deg, #f6f8fa 0%, #e9eef4 100%)",
                overflow: "hidden",
            }}
        >
            <Title
                level={1}
                style={{
                    marginTop: 0,
                    marginBottom: "16px",
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "#2c3e50",
                    padding: "24px 24px 0", // 增加内边距
                }}
            >
                {model.real_model_namne}
            </Title>
            <Paragraph
                style={{
                    fontSize: "18px",
                    color: "#555",
                    marginBottom: "24px",
                    padding: "0 24px", // 增加内边距
                }}
            >
                {model.description}
            </Paragraph>

            <Descriptions
                bordered
                column={{ xs: 1, sm: 2 }}
                labelStyle={{
                    fontWeight: "bold",
                    paddingLeft: "24px",
                }} // 增加内边距
                contentStyle={{
                    color: "#333",
                    paddingRight: "24px",
                }} // 增加内边距
            >
                <Descriptions.Item label={t("table.type")}>
                    {model.type === "Chat"
                        ? t("table.type_chat")
                        : model.type === "Application"
                            ? t("table.type_application")
                            : model.type === "Chat(Thinking)"
                                ? t("table.type_chat_thinking")
                                : model.type}
                </Descriptions.Item>
                <Descriptions.Item label={t("table.organization")}>
                    {model.organization}
                </Descriptions.Item>
                <Descriptions.Item label={t("table.releaseDate")}>
                    {model.releaseDate}
                </Descriptions.Item>
                <Descriptions.Item label={t("table.website")}>
                    <Typography.Link
                        href={model.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                        }}
                    >
                        {model.website} <ExportOutlined />
                    </Typography.Link>
                </Descriptions.Item>
            </Descriptions>
        </Card>
    );
}; 