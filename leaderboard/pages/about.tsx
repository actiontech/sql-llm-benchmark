import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative min-h-screen">
        <Head>
          <title>{t('about.title')} - SCALE SQL LLM Leaderboard</title>
          <meta name="description" content={t('about.description')} />
        </Head>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Head>
        <title>{t('about.title')} - SCALE SQL LLM Leaderboard</title>
        <meta name="description" content={t('about.description')} />
        <meta property="og:title" content={t('about.title')} />
        <meta property="og:description" content={t('about.description')} />
      </Head>

      <main className="relative min-h-screen bg-white pt-[58px] md:pt-[42px]">
        <div className="mx-auto max-w-[900px] px-7 py-16 sm:px-11 sm:py-20">
          <div className="flex flex-col gap-12 md:gap-8">
            <section className="rounded-xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-lg md:p-6">
              <h2 className="mb-4 border-b-2 border-[#e8e8e8] pb-3 text-2xl font-semibold text-[#262626] md:text-xl">
                {t('about.section1.title')}
              </h2>
              <p className="m-0 text-base leading-[1.8] text-[#595959] md:text-[15px]">
                {t('about.section1.content')}
              </p>
            </section>

            <section className="rounded-xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-lg md:p-6">
              <h2 className="mb-4 border-b-2 border-[#e8e8e8] pb-3 text-2xl font-semibold text-[#262626] md:text-xl">
                {t('about.section2.title')}
              </h2>
              <p className="m-0 text-base leading-[1.8] text-[#595959] md:text-[15px]">
                {t('about.section2.content')}
              </p>
            </section>

            <section className="rounded-xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-lg md:p-6">
              <h2 className="mb-4 border-b-2 border-[#e8e8e8] pb-3 text-2xl font-semibold text-[#262626] md:text-xl">
                {t('about.section3.title')}
              </h2>
              <p className="m-0 text-base leading-[1.8] text-[#595959] md:text-[15px]">
                {t('about.section3.content_before')}
                <Link
                  href="https://github.com/actiontech/sql-llm-benchmark"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-[#1890ff] hover:text-[#40a9ff] hover:underline transition-colors"
                >
                  {t('about.section3.content_link')}
                </Link>
                {t('about.section3.content_after')}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
