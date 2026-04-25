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
            title="生词记忆笔记本"
            description="输入陌生单词 → 中文 / 音标 / 词根 / 英文释义 / 例句 + 一键发音。每记一次自动累计复习次数。"
            status="即将推出"
          />
          <FeatureCard
            title="每日听写"
            description="设定每日单词数，系统给中文、朗读英文，你来拼写，自动判分。"
            status="即将推出"
          />
        </section>

        <footer className="text-sm text-zinc-400 dark:text-zinc-600 pt-8">
          搭建中 · v0.0.1
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-left transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {status}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
