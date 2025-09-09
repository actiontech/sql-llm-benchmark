import React from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { BrowserRouter } from "react-router-dom";
import { App } from "antd";
import "../lib/i18n"; // 导入i18n配置
import "../styles/globals.css";
import Router from "next/router";
import NProgress from "nprogress"; // 导入 NProgress
import "nprogress/nprogress.css"; // 导入 NProgress 样式
import Footer from "../components/Footer"; // 导入Footer组件

// 配置 NProgress
NProgress.configure({ showSpinner: false });

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

function MyApp({ Component, pageProps }: AppProps) {
  // 检查是否在客户端环境
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 在服务器端渲染时，不渲染BrowserRouter
  if (!isMounted) {
    return (
      <>
        <Head>
          <title>模型评测排行榜</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <App>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
          >
            <Component {...pageProps} />
            <Footer />
          </div>
        </App>
      </>
    );
  }

  // 客户端渲染时，使用BrowserRouter
  return (
    <>
      <Head>
        <title>模型评测排行榜</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App>
        <div
          style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
        >
          <BrowserRouter>
            <Component {...pageProps} />
          </BrowserRouter>
          <Footer />
        </div>
      </App>
    </>
  );
}

export default MyApp;
