import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from "next/document";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import type { EmotionCache } from "@emotion/cache";
import i18n from "../lib/i18n";

interface SeoData {
  title: string;
  description: string;
  keywords: string;
}

interface MyDocumentProps {
  emotionCache: EmotionCache;
  seoData: SeoData;
  locale: string;
}

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;

    // 在服务端通过请求头检测浏览器语言
    let locale = "en";
    if (ctx.req?.headers) {
      const acceptLanguage = ctx.req.headers['accept-language'] as string | undefined;
      // 检测是否为中文（zh, zh-CN, zh-TW 等）
      if (acceptLanguage) {
        const lang = acceptLanguage.toLowerCase().split(',')[0].trim();
        if (lang.startsWith('zh')) {
          locale = "zh";
        }
      }
    }

    // 在渲染页面之前设置 i18n 语言
    await i18n.changeLanguage(locale);

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) =>
        (
          <StyleProvider cache={cache}>
            <App {...props} />
          </StyleProvider>
        ),
      });

    const initialProps = await Document.getInitialProps(ctx);
    const style = extractStyle(cache, true);

    // 获取 SEO 数据（此时 i18n 已经设置为正确的语言）
    const seoData: SeoData = i18n.t("seo", { returnObjects: true }) as SeoData;

    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          <style dangerouslySetInnerHTML={{ __html: style }} />
        </>
      ),
      seoData,
      locale,
    };
  }

  render() {
    const { locale } = this.props;
    const canonicalUrl = "http://sql-llm-leaderboard.com"; // 网站URL，作为默认的og:image和twitter:image的基础URL

    return (
      <Html lang={locale}>
        <Head>
          {/* Google Tag Manager */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KPSPKB26');`,
            }}
          />
          {/* End Google Tag Manager */}

          {/* 百度统计 */}
          <script
            dangerouslySetInnerHTML={{
              __html: `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?5a5835c49033f6e49397df9f1b654ed0";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`,
            }}
          />
          {/* End 百度统计 */}
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=1500, initial-scale=1" />
          <meta name="author" content="ActionTech" />

          {/* 百度站点验证 */}
          <meta name="baidu-site-verification" content="codeva-JmWsVgyVSb" />

          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          {/* og:url, og:title, og:description 将在页面组件中动态设置 */}
          <meta property="og:image" content={`${canonicalUrl}/og-image.jpg`} />

          {/* Twitter */}
          <meta property="twitter:card" content="summary_large_image" />
          {/* twitter:url, twitter:title, twitter:description 将在页面组件中动态设置 */}
          <meta
            property="twitter:image"
            content={`${canonicalUrl}/og-image.jpg`}
          />
        </Head>
        <body>
          {/* Google Tag Manager (noscript) */}
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KPSPKB26"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
          {/* End Google Tag Manager (noscript) */}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
