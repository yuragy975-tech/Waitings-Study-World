"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

type Level = "beginner" | "intermediate" | "advanced";
type GradientKey = "warm" | "ocean" | "nature" | "art" | "sun" | "dark";

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "beginner", label: "初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
];

const GRADIENT_OPTIONS: { value: GradientKey; label: string; preview: string }[] = [
  { value: "warm", label: "暖橙", preview: "from-amber-400 via-orange-500 to-rose-500" },
  { value: "ocean", label: "海洋", preview: "from-sky-400 via-blue-500 to-indigo-600" },
  { value: "nature", label: "自然", preview: "from-emerald-400 via-teal-500 to-cyan-600" },
  { value: "art", label: "紫粉", preview: "from-purple-400 via-fuchsia-500 to-pink-500" },
  { value: "sun", label: "阳光", preview: "from-yellow-400 via-amber-500 to-orange-500" },
  { value: "dark", label: "暗色", preview: "from-zinc-700 via-zinc-800 to-zinc-900" },
];

type Status = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  id: string;
  title: string;
  durationSec: number;
  segmentCount: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [level, setLevel] = useState<Level>("intermediate");
  const [gradient, setGradient] = useState<GradientKey>("ocean");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".mp3") && !f.type.startsWith("audio/")) {
      setErrorMsg("只支持 mp3 音频文件");
      return;
    }
    setFile(f);
    setErrorMsg("");
    if (!title) {
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      setTitle(name);
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    fd.append("source", source || "本地导入");
    fd.append("level", level);
    fd.append("gradient", gradient);

    try {
      const res = await fetch("/api/upload-material", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "上传失败");
        return;
      }
      setStatus("success");
      setResult(data);
    } catch {
      setStatus("error");
      setErrorMsg("网络错误，请确认开发服务器正在运行");
    }
  };

  const reset = () => {
    setFile(null);
    setTitle("");
    setSource("");
    setLevel("intermediate");
    setGradient("ocean");
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
  };

  return (
    <div className="flex-1 px-4 sm:px-6 py-8 bg-background">
      <div className="max-w-xl mx-auto">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              导入素材
            </h1>
            <p className="mt-2 text-muted">
              上传 mp3，AI 自动转写生成字幕和时间戳
            </p>
          </div>
          <Link
            href="/listening"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← 精听研习
          </Link>
        </header>

        {status === "success" && result ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-8 text-center space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
              导入成功！
            </h2>
            <div className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
              <p>标题：{result.title}</p>
              <p>时长：{Math.floor(result.durationSec / 60)}分{result.durationSec % 60}秒</p>
              <p>句子数：{result.segmentCount}</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href={`/listening/${result.id}`}
                className="px-5 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                去练习
              </Link>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl bg-accent-light text-foreground text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                继续导入
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-accent bg-accent-light"
                  : file
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-card-border hover:border-muted"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/mpeg,.mp3"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · 点击可更换
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-3xl">&#127925;</p>
                  <p className="text-foreground font-medium">
                    拖入 mp3 文件，或点击选择
                  </p>
                  <p className="text-xs text-muted/60">
                    支持英语音频，建议 2-15 分钟
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Field label="标题" hint="默认用文件名">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Why People Love Coffee"
                  className="w-full rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </Field>

              <Field label="来源" hint="可选">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="BBC / TED / NPR ..."
                  className="w-full rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </Field>

              <Field label="难度">
                <div className="flex gap-2">
                  {LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLevel(opt.value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        level === opt.value
                          ? "bg-accent text-accent-fg"
                          : "bg-accent-light text-foreground hover:opacity-80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="封面色">
                <div className="flex gap-2">
                  {GRADIENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGradient(opt.value)}
                      className={`flex-1 h-10 rounded-xl bg-gradient-to-br ${opt.preview} transition-all ${
                        gradient === opt.value
                          ? "ring-2 ring-offset-2 ring-accent dark:ring-offset-background scale-105"
                          : "opacity-60 hover:opacity-80"
                      }`}
                      title={opt.label}
                    />
                  ))}
                </div>
              </Field>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || status === "uploading"}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                !file || status === "uploading"
                  ? "bg-accent-light text-muted cursor-not-allowed"
                  : "bg-accent text-accent-fg hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {status === "uploading" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  AI 转写中，请稍候（约 30 秒 - 2 分钟）...
                </span>
              ) : (
                "开始导入"
              )}
            </button>

            {status === "uploading" && (
              <p className="text-center text-xs text-muted/60">
                Whisper 正在识别语音并生成时间戳，请不要关闭页面
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {hint && <span className="ml-2 font-normal text-muted">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}
