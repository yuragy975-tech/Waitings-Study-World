import Link from "next/link";
import { formatDuration, levelLabel } from "@/lib/listening";
import { loadAllMaterials } from "@/lib/listening-server";

const LEVEL_COLOR = {
  beginner: "bg-emerald-500/90",
  intermediate: "bg-amber-500/90",
  advanced: "bg-rose-500/90",
} as const;

const LEVEL_GRADIENT = {
  beginner: "from-emerald-400 via-teal-500 to-cyan-600",
  intermediate: "from-sky-400 via-blue-500 to-indigo-600",
  advanced: "from-rose-400 via-red-500 to-purple-600",
} as const;

export default async function ListeningHomePage() {
  const materials = await loadAllMaterials();

  return (
    <div className="flex-1 px-4 sm:px-6 py-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              精听研习
            </h1>
            <p className="mt-2 text-muted">
              盲听 → 对照听 → 再盲听。把一篇音频啃透，比泛听十篇都强。
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/upload"
              className="text-sm px-3 py-1.5 rounded-lg bg-accent text-accent-fg font-medium hover:opacity-90 transition-opacity"
            >
              + 导入素材
            </Link>
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              ← 首页
            </Link>
          </div>
        </header>

        {materials.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border p-10 text-center">
            <p className="text-muted">
              还没有素材。把 mp3 + meta.json 放进{" "}
              <code className="px-1 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                public/listening-materials/&lt;id&gt;/
              </code>{" "}
              就会自动出现在这里。
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {materials.map((m) => (
              <Link
                key={m.id}
                href={`/listening/${m.id}`}
                className="group block rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <div
                  className={`relative aspect-[16/9] sm:aspect-[2/1] bg-gradient-to-br ${LEVEL_GRADIENT[m.level]} flex items-end p-6 sm:p-8`}
                >
                  <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold text-white px-2.5 py-1 rounded-full ${LEVEL_COLOR[m.level]}`}
                    >
                      {levelLabel(m.level)}
                    </span>
                    {m.cefr && (
                      <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm tracking-wide">
                        {m.cefr}
                      </span>
                    )}
                    <span className="text-xs font-medium text-white/90 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm">
                      {formatDuration(m.durationSec)}
                    </span>
                  </div>
                  <div className="text-white drop-shadow-md">
                    <p className="text-xs uppercase tracking-widest opacity-90 mb-1">
                      {m.source}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold leading-tight group-hover:translate-x-0.5 transition-transform">
                      {m.title}
                    </h2>
                    {m.difficultyReason && (
                      <p className="text-xs text-white/85 mt-1.5">
                        {m.difficultyReason}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs text-muted/60 text-center">
          想加新素材？
          <Link href="/upload" className="underline hover:text-foreground transition-colors">
            点这里上传 mp3
          </Link>
          ，AI 自动转写
        </p>
      </div>
    </div>
  );
}
