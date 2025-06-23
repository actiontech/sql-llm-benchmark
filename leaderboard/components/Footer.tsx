import React from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { GithubOutlined } from "@ant-design/icons"; // 导入GithubOutlined图标

const Footer: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <footer
      style={{
        textAlign: "center",
        padding: "24px",
        color: "#888",
        fontSize: "14px",
        marginTop: "auto" /* 使footer始终在底部 */,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span>{t("footer.copyright")}</span>
        <span>|</span>
        <Link
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#888" }}
        >
          {t("footer.beian")}
        </Link>
        <span>|</span>
        <Link
          href="https://beian.mps.gov.cn/#/query/webSearch?code=31011202021160"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#888",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <img
            src="/icons/gongan.png"
            alt="沪公网安备"
            style={{ height: "16px" }}
          />
          沪公网安备31011202021160号
        </Link>
        <span>|</span> {/* 添加分隔符 */}
        <Link
          href="https://github.com/actiontech/sql-llm-benchmark"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#888",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <GithubOutlined style={{ fontSize: "16px" }} /> {/* GitHub图标 */}
          GitHub
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
