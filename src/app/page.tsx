import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
      <main className="w-full max-w-3xl flex flex-col items-center text-center gap-12 py-24">
        <header className="flex flex-col items-center gap-4">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            生词宝典
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            ShengCi BaoDian · 我的私人英语学习助手
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 w-full">
          <FeatureCard
            href="/notebook"
            title="我的生词本"
            description="输入陌生单词 → 加入笔记本，自动获取中文 / 音标 / 词形 + 美英双发音。每记一次自动累计。"
            status="可用"
            statusTone="ready"
          />
          <FeatureCard
            href="/dictation"
            title="每日听写"
            description="从笔记本随机抽词，给中文、朗读英文，你来拼写，自动判分 + 错题回顾。"
            status="可用"
            statusTone="ready"
          />
          <FeatureCard
            href="/listening"
            title="啃料训练"
            description="选一篇音频，模糊文本盲听 → 对照听 → 再盲听。三档挖空切换，点词即查，自动入生词本。"
            status="新功能"
            statusTone="ready"
          />
          <FeatureCard
            href="/sentences"
            title="我的句子本"
            description="收藏好句子，AI 一键给出同义改写 + 中文翻译 + 语法点提示，随时朗读复习。"
            status="新功能"
            statusTone="ready"
          />
        </section>

        <footer className="text-sm text-zinc-400 dark:text-zinc-600 pt-8">
          搭建中 · v0.1.0
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
  statusTone,
  href,
}: {
  title: string;
  description: string;
  status: string;
  statusTone: "ready" | "upcoming";
  href?: string;
}) {
  const statusClass =
    statusTone === "ready"
      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200"
      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";

  const inner = (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-left transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>
          {status}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
