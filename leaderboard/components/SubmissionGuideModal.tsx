import React from "react";
import { Modal, Button, Typography, Space, List } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Paragraph, Title, Text } = Typography;

interface SubmissionGuideModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SubmissionGuideModal: React.FC<SubmissionGuideModalProps> = ({
    visible,
    onClose
}) => {
    const { t } = useTranslation("common");
    const GITHUB_URL = "https://github.com/actiontech/sql-llm-benchmark";

    const requirements = [
        t("submission_guide.req1"),
        t("submission_guide.req2"),
        t("submission_guide.req3"),
        t("submission_guide.req4"),
        t("submission_guide.req5"),
        t("submission_guide.req6"),
    ];

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    {t("actions.close")}
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<GithubOutlined />}
                    href={GITHUB_URL}
                    target="_blank"
                >
                    {t("submission_guide.cta_button")}
                </Button>,
            ]}
            width="50%"
            style={{ top: 50, maxWidth: "800px" }}
            title={
                <Space>
                    <GithubOutlined />
                    <Text strong>{t("submission_guide.title")}</Text>
                </Space>
            }
        >
            <Paragraph>{t("submission_guide.intro")}</Paragraph>
            <Title level={5} style={{ marginTop: "24px" }}>
                {t("submission_guide.req_title")}
            </Title>
            <List
                bordered
                dataSource={requirements}
                renderItem={(item, index) => (
                    <List.Item>
                        <Text>
                            <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                                {index + 1}.
                            </span>
                            {item}
                        </Text>
                    </List.Item>
                )}
                style={{ background: "#f9f9f9", borderRadius: "8px" }}
            />
        </Modal>
    );
}; 