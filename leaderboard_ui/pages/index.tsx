import { useEffect } from "react";
import { useRouter } from "next/router";
import path from "path";
import fs from "fs";
import { GetStaticProps } from "next";

interface HomePageProps {
  latestMonth: string | null;
}

export default function HomePage({ latestMonth }: HomePageProps) {
  const router = useRouter();

  useEffect(() => {
    if (latestMonth) {
      router.replace(`/ranking/${latestMonth}`);
    } else {
      // 如果没有月份数据，可以重定向到404页面或者一个提示页面
      router.replace("/404"); // 或者其他默认页面
    }
  }, [latestMonth, router]);

  return null; // 此页面仅用于重定向，不渲染任何内容
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const dataDir = path.join(process.cwd(), "public", "data", "eval_reports");
  let latestMonth: string | null = null;

  try {
    const filenames = fs.readdirSync(dataDir);
    const months = filenames
      .filter((name) => name.startsWith("models-") && name.endsWith(".json"))
      .map((name) => name.replace("models-", "").replace(".json", ""))
      .sort((a, b) => b.localeCompare(a)); // 降序排列，最新月份在前

    if (months.length > 0) {
      latestMonth = months[0];
    }
  } catch (error) {
    console.error("Error reading data directory in getStaticProps:", error);
  }

  return {
    props: {
      latestMonth,
    },
  };
};
