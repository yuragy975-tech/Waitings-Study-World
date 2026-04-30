"use client";

import { useRef, useState } from "react";
import { AiChat } from "@/components/AiChat";

const SUGGESTED_TOPICS = [
  { label: "经济学入门", icon: "📈" },
  { label: "量子力学基础", icon: "⚛️" },
  { label: "心理学常识", icon: "🧠" },
  { label: "博弈论", icon: "♟️" },
  { label: "进化论", icon: "🧬" },
  { label: "哲学思维方法", icon: "💭" },
  { label: "气候变化", icon: "🌍" },
  { label: "人工智能原理", icon: "🤖" },
];

type DocInfo = {
  title: string;
  text: string;
  charCount: number;
  truncated: boolean;
};

type Tab = "topic" | "document";

export default function LearnPage() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocInfo | null>(null);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<Tab>("topic");

  // document upload state
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docReady, setDocReady] = useState<DocInfo | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (activeTopic || activeDoc) {
    return (
      <AiChat
        mode="general"
        topic={activeTopic ?? activeDoc?.title}
        topicLabel={activeTopic ?? activeDoc?.title ?? ""}
        documentContent={activeDoc?.text}
        onBack={() => {
          setActiveTopic(null);
          setActiveDoc(null);
        }}
      />
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (text) setActiveTopic(text);
  }

  async function uploadFile(file: File) {
    setDocLoading(true);
    setDocError("");
    setDocReady(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/parse-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.message || data.error || "解析失败");
        return;
      }
      setDocReady({
        title: data.title,
        text: data.text,
        charCount: data.charCount,
        truncated: data.truncated,
      });
    } catch (err) {
      setDocError("网络错误：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDocLoading(false);
    }
  }

  async function handlePasteSubmit() {
    const text = pasteText.trim();
    if (!text) return;

    setDocLoading(true);
    setDocError("");
    setDocReady(null);

    const fd = new FormData();
    fd.append("text", text);

    try {
      const res = await fetch("/api/parse-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.message || data.error || "解析失败");
        return;
      }
      setDocReady({
        title: data.title,
        text: data.text,
        charCount: data.charCount,
        truncated: data.truncated,
      });
    } catch (err) {
      setDocError("网络错误：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDocLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="min-h-full bg-background px-4 sm:px-8 py-8 lg:py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">博学研习</h1>
          <p className="mt-1.5 text-sm text-muted">
            输入主题或上传文档，小典用费曼学习法帮你真正理解它。
          </p>
        </header>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-accent-light rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab("topic")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "topic"
                ? "bg-card-bg text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            输入主题
          </button>
          <button
            type="button"
            onClick={() => setTab("document")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "document"
                ? "bg-card-bg text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            上传文档
          </button>
        </div>

        {/* Tab: Topic input */}
        {tab === "topic" && (
          <>
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="今天想学点什么？比如：博弈论、进化论、量子力学..."
                  className="flex-1 rounded-xl border border-card-border bg-card-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 px-5 py-3 rounded-xl bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  开始学习
                </button>
              </div>
            </form>

            <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <span className="inline-block w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 text-center leading-4 shrink-0">
                !
              </span>
              输入主题模式下，AI 基于自身知识教学，无法保证100%准确。如需学习一本具体的书，请切换到「上传文档」。
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted mb-3">
                热门主题
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTED_TOPICS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setActiveTopic(t.label)}
                    className="flex items-center gap-2.5 rounded-xl border border-card-border bg-card-bg px-4 py-3 text-left transition-all hover:shadow-md hover:border-accent/30 group"
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab: Document upload */}
        {tab === "document" && (
          <div className="space-y-5">
            {/* File upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-accent bg-accent-light"
                  : "border-card-border hover:border-muted"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-4xl mb-3">
                {docLoading ? "..." : "📄"}
              </div>
              <p className="text-sm font-medium text-foreground">
                {docLoading
                  ? "正在解析文档..."
                  : "拖拽文件到这里，或点击选择"}
              </p>
              <p className="text-xs text-muted mt-1">
                支持 PDF、TXT、MD 文件
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-card-border" />
              <span className="text-xs text-muted">
                或者直接粘贴文本
              </span>
              <div className="flex-1 h-px bg-card-border" />
            </div>

            {/* Paste text area */}
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="把书的章节、文章、笔记等内容粘贴到这里..."
                rows={6}
                className="w-full rounded-xl border border-card-border bg-card-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim() || docLoading}
                className="mt-2 px-5 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                解析文本
              </button>
            </div>

            {/* Error */}
            {docError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
                {docError}
              </div>
            )}

            {/* Document ready card */}
            {docReady && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {docReady.title}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      已提取 {docReady.charCount.toLocaleString()} 个字符
                      {docReady.truncated && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {" "}
                          （文档过长，已截取前 80,000 字符）
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted mt-2 line-clamp-3">
                      {docReady.text.slice(0, 200)}...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDoc(docReady)}
                  className="mt-4 w-full py-3 rounded-xl bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  基于此文档开始学习
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-card-border p-4 text-sm text-muted space-y-1.5">
              <p className="font-medium text-foreground">
                为什么要上传文档？
              </p>
              <p>
                上传文档后，AI 会严格基于你给的内容来教学，不会编造信息。这就像
                NotebookLM 一样，确保你学到的都是原文里有的知识。
              </p>
              <p>
                如果只输入主题名，AI 用自身知识教学，可能存在不准确的地方。
              </p>
            </div>
          </div>
        )}

        {/* Info section - shown in both tabs */}
        <div className="mt-10 rounded-2xl border border-dashed border-card-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-2">
            学习三阶段
          </h3>
          <div className="space-y-2 text-sm text-muted">
            <p>
              <strong className="text-foreground">
                1. 猎杀
              </strong>{" "}
              — 小典帮你提取最核心的 20%，快速抓住重点
            </p>
            <p>
              <strong className="text-foreground">
                2. 费曼深学
              </strong>{" "}
              — 一次一个问题，用最简单的话解释给6岁小孩听
            </p>
            <p>
              <strong className="text-foreground">
                3. 输出
              </strong>{" "}
              — 生成知识卡片，把学到的变成可以教给别人的话术
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
