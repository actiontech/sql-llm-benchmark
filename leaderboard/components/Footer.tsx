import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { GithubOutlined } from "@ant-design/icons"; // 导入GithubOutlined图标

const Footer: React.FC = () => {
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 服务器端渲染时使用默认内容，避免Hydration错误
  const copyright = mounted ? t("footer.copyright") : "© Copyright 2025 上海爱可生信息技术股份有限公司 版权所有";
  const beian = mounted ? t("footer.beian") : "沪ICP备12003970号-1";

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
        <span>{copyright}</span>
        <span>|</span>
        <Link
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#888" }}
        >
          {beian}
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
