"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  Brain,
  Headphones,
  Lightbulb,
  NotebookPen,
  PenLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

const FEATURES = [
  {
    href: "/listening",
    icon: Headphones,
    title: "精听研习",
    desc: "盲听 · 对照 · 精听",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-100 dark:border-teal-900/50",
  },
  {
    href: "/notebook",
    icon: BookOpen,
    title: "生词本",
    desc: "查词 · 收藏 · 复习",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  {
    href: "/dictation",
    icon: PenLine,
    title: "每日听写",
    desc: "听音 · 拼写 · 打分",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-100 dark:border-violet-900/50",
  },
  {
    href: "/learn",
    icon: Lightbulb,
    title: "博学研习",
    desc: "任意话题 · 上传文档",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-100 dark:border-indigo-900/50",
  },
  {
    href: "/sentences",
    icon: NotebookPen,
    title: "句子本",
    desc: "收藏 · 改写 · 语法",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-100 dark:border-amber-900/50",
  },
  {
    href: "/grammar",
    icon: Brain,
    title: "语法学习",
    desc: "费曼学习法 · AI教练",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-100 dark:border-rose-900/50",
  },
];

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [greeting, setGreeting] = useState("你好");
  useEffect(() => setGreeting(getGreeting()), []);

  return (
    <div className="min-h-full bg-background px-4 sm:px-8 py-8 lg:py-10">
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-accent" />
            <span className="text-sm text-muted">{greeting}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {isSignedIn && user?.firstName
              ? `${user.firstName} 的 Study World`
              : "Waiting's Study World"}
          </h1>
          <p className="mt-1 text-muted text-sm">
            选择一个模块开始学习，每天进步一点点
          </p>

          {!isSignedIn && (
            <div className="mt-4 flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity">
                  登录
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2.5 rounded-xl border border-card-border text-foreground text-sm font-medium hover:bg-accent-light transition-colors">
                  注册
                </button>
              </SignUpButton>
            </div>
          )}
        </header>

        {/* Feature cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className={`
                  group flex items-start gap-4 rounded-2xl border p-5 transition-all
                  ${f.bg} ${f.border}
                  hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                <div
                  className={`shrink-0 rounded-xl p-2.5 ${f.color} bg-white/70 dark:bg-white/5 shadow-sm`}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    {f.title}
                  </h2>
                  <p className="text-sm text-muted mt-0.5">{f.desc}</p>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Quick actions */}
        <section className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:border-accent/30 transition-colors"
          >
            <Upload size={16} />
            上传听力素材
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-muted/60">
          Waiting&apos;s Study World · v0.2.0
        </footer>
      </div>
    </div>
  );
}
