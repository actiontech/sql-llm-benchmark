import React from "react";
import { Card, Typography, Descriptions } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Model } from "../types/ranking";
import cardStyles from "../styles/Card.module.css";
import { getModelTypeText } from "../utils/modelTypeUtils";

const { Title, Paragraph } = Typography;

interface ModelDetailCardProps {
    model: Model;
}

export const ModelDetailCard: React.FC<ModelDetailCardProps> = ({ model }) => {
    const { t } = useTranslation("common");

    return (
        <Card
            bordered={false}
            className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottomLarge}`}
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
                    {getModelTypeText(model.type, t)}
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