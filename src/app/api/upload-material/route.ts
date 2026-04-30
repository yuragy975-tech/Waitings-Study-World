import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const maxDuration = 300; // Whisper 转写可能需要几分钟

const GRADIENTS: Record<string, string> = {
  warm: "from-amber-400 via-orange-500 to-rose-500",
  ocean: "from-sky-400 via-blue-500 to-indigo-600",
  nature: "from-emerald-400 via-teal-500 to-cyan-600",
  art: "from-purple-400 via-fuchsia-500 to-pink-500",
  sun: "from-yellow-400 via-amber-500 to-orange-500",
  dark: "from-zinc-700 via-zinc-800 to-zinc-900",
};

const MODEL_DIR = path.join(os.homedir(), ".whisper-models");
const MODEL_NAME = "ggml-base.en.bin";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);
const HF_ENDPOINT = process.env.HF_ENDPOINT ?? "https://hf-mirror.com";
const MODEL_URL = `${HF_ENDPOINT}/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;

const ROOT = path.join(process.cwd(), "public", "listening-materials");

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args);
    let stdout = "", stderr = "";
    p.stdout?.on("data", (d: Buffer) => (stdout += d));
    p.stderr?.on("data", (d: Buffer) => (stderr += d));
    p.on("error", rej);
    p.on("close", (code) =>
      code === 0
        ? res({ stdout, stderr })
        : rej(new Error(`${cmd} exit ${code}: ${stderr.slice(-400)}`)),
    );
  });
}

async function cmdExists(cmd: string): Promise<boolean> {
  try {
    await run("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

async function ensureModel(): Promise<void> {
  try {
    await fs.access(MODEL_PATH);
    return;
  } catch {}
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const r = await fetch(MODEL_URL);
  if (!r.ok) throw new Error(`Whisper 模型下载失败 HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(MODEL_PATH, buf);
}

function srtTimeToSec(s: string): number {
  const m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

interface SrtSegment {
  startSec: number;
  endSec: number;
  text: string;
  words?: { startSec: number; endSec: number; text: string }[];
}

function parseSrt(srt: string): SrtSegment[] {
  const blocks = srt.trim().split(/\n\s*\n/);
  const out: SrtSegment[] = [];
  for (const b of blocks) {
    const lines = b.split("\n");
    if (lines.length < 3) continue;
    const time = lines[1] ?? "";
    const m = time.match(/(.+?)\s+-->\s+(.+)/);
    if (!m) continue;
    const text = lines.slice(2).join(" ").trim();
    if (!text) continue;
    out.push({
      startSec: Math.round(srtTimeToSec(m[1].trim()) * 10) / 10,
      endSec: Math.round(srtTimeToSec(m[2].trim()) * 10) / 10,
      text,
    });
  }
  return out;
}

async function transcribe(mp3Path: string, matDir: string): Promise<SrtSegment[]> {
  const wavPath = path.join(matDir, "_tmp.wav");
  const sentPrefix = path.join(matDir, "_w_sent");
  const wordPrefix = path.join(matDir, "_w_word");

  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3Path, "-ar", "16000", "-ac", "1", wavPath]);
  await run("whisper-cli", ["-m", MODEL_PATH, "-f", wavPath, "-l", "en", "-osrt", "-of", sentPrefix]);
  const sentences = parseSrt(await fs.readFile(sentPrefix + ".srt", "utf8"));

  await run("whisper-cli", ["-m", MODEL_PATH, "-f", wavPath, "-l", "en", "-ml", "1", "--split-on-word", "-osrt", "-of", wordPrefix]);
  const words = parseSrt(await fs.readFile(wordPrefix + ".srt", "utf8"));

  for (const sent of sentences) {
    sent.words = words
      .filter((w) => w.startSec >= sent.startSec - 0.05 && w.startSec < sent.endSec + 0.05)
      .map((w) => ({ startSec: w.startSec, endSec: w.endSec, text: w.text }));
  }

  await fs.unlink(wavPath).catch(() => {});
  await fs.unlink(sentPrefix + ".srt").catch(() => {});
  await fs.unlink(wordPrefix + ".srt").catch(() => {});
  return sentences;
}

const MUSIC_RE = /[♪♫♩♬]/;

function detectIntroSec(segments: SrtSegment[]): number {
  if (!segments.length) return 0;
  for (const seg of segments.slice(0, 8)) {
    const words = seg.words ?? [];
    for (const w of words) {
      const clean = w.text.toLowerCase().replace(/[^a-z]/g, "");
      if (clean === "hello" || clean === "hi" || clean === "welcome") {
        return w.startSec > 1 ? Math.round(w.startSec * 10) / 10 : 0;
      }
    }
    if (!words.length && /\b(hello|hi|welcome)\b/i.test(seg.text)) {
      return seg.startSec > 1 ? Math.round(seg.startSec * 10) / 10 : 0;
    }
  }
  let introEnd = 0;
  for (const seg of segments.slice(0, 6)) {
    for (const w of seg.words ?? []) {
      if (MUSIC_RE.test(w.text)) introEnd = Math.max(introEnd, w.endSec);
    }
  }
  if (introEnd > 0) {
    for (const seg of segments.slice(0, 6)) {
      if (seg.startSec < introEnd + 1.5 && seg.endSec <= introEnd + 3) {
        introEnd = Math.max(introEnd, seg.endSec);
      }
    }
  }
  return introEnd > 1 ? Math.round(introEnd * 10) / 10 : 0;
}

function sanitizeId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  if (!(await cmdExists("ffmpeg")) || !(await cmdExists("whisper-cli"))) {
    return NextResponse.json(
      { error: "服务器缺少 ffmpeg 或 whisper-cli，请先安装：brew install ffmpeg whisper-cpp" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误，需要 multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少 mp3 文件" }, { status: 400 });
  }

  const title = (formData.get("title") as string)?.trim() || "未命名素材";
  const source = (formData.get("source") as string)?.trim() || "本地导入";
  const level = (formData.get("level") as string) || "intermediate";
  const gradientKey = (formData.get("gradient") as string) || "ocean";
  let id = (formData.get("id") as string)?.trim() || "";

  if (!["beginner", "intermediate", "advanced"].includes(level)) {
    return NextResponse.json({ error: "level 必须是 beginner / intermediate / advanced" }, { status: 400 });
  }

  const gradient = GRADIENTS[gradientKey] ?? GRADIENTS.ocean;

  if (!id) {
    id = sanitizeId(title);
  } else {
    id = sanitizeId(id);
  }
  if (!id) id = `material-${Date.now()}`;

  const matDir = path.join(ROOT, id);
  try {
    await fs.access(path.join(matDir, "meta.json"));
    return NextResponse.json({ error: `素材 "${id}" 已存在` }, { status: 409 });
  } catch {}

  await fs.mkdir(matDir, { recursive: true });

  try {
    const mp3Path = path.join(matDir, "audio.mp3");
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(mp3Path, buf);

    await ensureModel();
    const segments = await transcribe(mp3Path, matDir);

    if (segments.length === 0) {
      await fs.rm(matDir, { recursive: true });
      return NextResponse.json({ error: "Whisper 未识别出任何句子，可能音频太短或非英语" }, { status: 422 });
    }

    const durationSec = Math.round(segments[segments.length - 1].endSec);
    const introSec = detectIntroSec(segments);

    const meta = {
      title,
      source,
      level,
      durationSec,
      introSec,
      coverGradient: gradient,
      audioFile: "audio.mp3",
      segments,
    };

    await fs.writeFile(path.join(matDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

    return NextResponse.json({
      success: true,
      id,
      title,
      durationSec,
      segmentCount: segments.length,
    });
  } catch (e: unknown) {
    await fs.rm(matDir, { recursive: true }).catch(() => {});
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `处理失败: ${msg}` }, { status: 500 });
  }
}
