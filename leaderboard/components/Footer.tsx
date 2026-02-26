import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { GithubOutlined } from "@ant-design/icons";
import { cn } from "../utils/cn";

const Footer: React.FC = () => {
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 服务器端渲染时使用默认内容，避免 Hydration 错误
  const copyright = mounted ? t("footer.copyright") : "© Copyright 2025 上海爱可生信息技术股份有限公司 版权所有";
  const beian = mounted ? t("footer.beian") : "沪ICP备12003970号-1";

  const linkBase = "text-gray-500 hover:text-gray-400 transition-colors";
  const linkWithIcon = cn(linkBase, "flex items-center gap-1.5");

  return (
    <footer className="mt-auto w-full px-4 py-4 text-center text-xs text-gray-500 sm:px-6 sm:py-6 sm:text-sm">
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5">
        <span>{copyright}</span>
        <span className="hidden sm:inline">|</span>
        <Link
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className={linkBase}
        >
          {beian}
        </Link>
        <span className="hidden sm:inline">|</span>
        <Link
          href="https://beian.mps.gov.cn/#/query/webSearch?code=31011202021160"
          target="_blank"
          rel="noopener noreferrer"
          className={linkWithIcon}
        >
          <img
            src="/icons/gongan.png"
            alt="沪公网安备"
            className="h-4 shrink-0"
          />
          沪公网安备31011202021160号
        </Link>
        <span className="hidden sm:inline">|</span>
        <Link
          href="https://github.com/actiontech/sql-llm-benchmark"
          target="_blank"
          rel="noopener noreferrer"
          className={linkWithIcon}
        >
          <GithubOutlined className="text-base shrink-0" />
          GitHub
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
