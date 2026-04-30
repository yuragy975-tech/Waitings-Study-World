#!/usr/bin/env node
// 本地素材导入：把你电脑上的 mp3 一键变成啃料素材
// 前置：brew install ffmpeg whisper-cpp
//
// 用法:
//   node scripts/import-local.mjs ~/Desktop/bbc-coffee.mp3
//   node scripts/import-local.mjs ~/Desktop/bbc-coffee.mp3 --title "Why People Love Coffee" --source "BBC 6 Minute English" --level beginner --gradient warm
//
// 可选参数:
//   --title    素材标题（默认用文件名）
//   --source   来源标签（默认 "本地导入"）
//   --level    难度: beginner / intermediate / advanced（默认 intermediate）
//   --gradient 封面色: warm / ocean / nature / art / sun / dark（默认 ocean）
//   --id       自定义 id（默认用文件名转换）

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { detectIntroSec } from "./lib/detect-intro.mjs";

const GRADIENTS = {
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

// ── 工具函数 ──────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const mp3 = args.find((a) => !a.startsWith("--"));
  const flag = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
  };
  const gradKey = flag("gradient", "ocean");
  return {
    mp3,
    title: flag("title", null),
    source: flag("source", "本地导入"),
    level: flag("level", "intermediate"),
    gradient: GRADIENTS[gradKey] ?? GRADIENTS.ocean,
    id: flag("id", null),
  };
}

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, opts);
    let stdout = "", stderr = "";
    p.stdout?.on("data", (d) => (stdout += d));
    p.stderr?.on("data", (d) => (stderr += d));
    p.on("error", rej);
    p.on("close", (code) =>
      code === 0
        ? res({ stdout, stderr })
        : rej(new Error(`${cmd} exit ${code}: ${stderr.slice(-400)}`)),
    );
  });
}

async function cmdExists(cmd) {
  try {
    await run("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

async function ensureModel() {
  try {
    await fs.access(MODEL_PATH);
    return;
  } catch {}
  await fs.mkdir(MODEL_DIR, { recursive: true });
  console.log(`📥 下载 Whisper 模型（~142MB）...`);
  const r = await fetch(MODEL_URL);
  if (!r.ok) throw new Error(`模型下载失败 HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(MODEL_PATH, buf);
  console.log(`✅ 模型已存: ${MODEL_PATH}`);
}

function srtTimeToSec(s) {
  const m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

function parseSrt(srt) {
  const blocks = srt.trim().split(/\n\s*\n/);
  const out = [];
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

function fileNameToId(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function fileNameToTitle(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── 主逻辑 ────────────────────────────────────────────────

async function transcribe(mp3Path, matDir) {
  const wavPath = path.join(matDir, "_tmp.wav");
  const sentPrefix = path.join(matDir, "_w_sent");
  const wordPrefix = path.join(matDir, "_w_word");

  console.log("🎵 转码为 WAV ...");
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3Path, "-ar", "16000", "-ac", "1", wavPath]);

  console.log("🗣️  Whisper 转写句子 ...");
  await run("whisper-cli", ["-m", MODEL_PATH, "-f", wavPath, "-l", "en", "-osrt", "-of", sentPrefix]);
  const sentences = parseSrt(await fs.readFile(sentPrefix + ".srt", "utf8"));

  console.log("📝 Whisper 转写单词 ...");
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

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.mp3) {
    console.error(`
用法: node scripts/import-local.mjs <mp3文件路径> [选项]

示例:
  node scripts/import-local.mjs ~/Desktop/bbc-coffee.mp3
  node scripts/import-local.mjs ~/Desktop/ted-talk.mp3 --title "My TED Talk" --source "TED" --level advanced --gradient art

选项:
  --title    素材标题（默认用文件名）
  --source   来源（默认 "本地导入"）
  --level    难度: beginner / intermediate / advanced（默认 intermediate）
  --gradient 封面色: ${Object.keys(GRADIENTS).join(" / ")}（默认 ocean）
  --id       自定义 id（默认用文件名转换）
`);
    process.exit(1);
  }

  if (!["beginner", "intermediate", "advanced"].includes(opts.level)) {
    console.error(`❌ level 必须是 beginner / intermediate / advanced，你传的是: ${opts.level}`);
    process.exit(1);
  }

  const mp3Abs = path.resolve(opts.mp3);
  try {
    await fs.access(mp3Abs);
  } catch {
    console.error(`❌ 文件不存在: ${mp3Abs}`);
    process.exit(1);
  }

  if (!(await cmdExists("ffmpeg"))) {
    console.error("❌ ffmpeg 没装。请先运行: brew install ffmpeg");
    process.exit(1);
  }
  if (!(await cmdExists("whisper-cli"))) {
    console.error("❌ whisper-cli 没装。请先运行: brew install whisper-cpp");
    process.exit(1);
  }

  await ensureModel();

  const id = (opts.id ?? fileNameToId(mp3Abs)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  const title = opts.title ?? fileNameToTitle(mp3Abs);
  const matDir = path.join(process.cwd(), "public", "listening-materials", id);

  try {
    const existing = await fs.readFile(path.join(matDir, "meta.json"), "utf8");
    if (existing) {
      console.error(`❌ 素材 "${id}" 已存在！如需覆盖，先删除: rm -rf public/listening-materials/${id}`);
      process.exit(1);
    }
  } catch {}

  await fs.mkdir(matDir, { recursive: true });

  console.log(`\n📂 素材 id: ${id}`);
  console.log(`📋 标题:    ${title}`);
  console.log(`📖 来源:    ${opts.source}`);
  console.log(`📊 难度:    ${opts.level}`);
  console.log(`🎨 封面色:  ${opts.gradient}\n`);

  console.log("📁 复制 mp3 ...");
  await fs.copyFile(mp3Abs, path.join(matDir, "audio.mp3"));

  console.log("🤖 开始 Whisper 转写（可能需要 30 秒到几分钟）...\n");
  const segments = await transcribe(path.join(matDir, "audio.mp3"), matDir);

  if (segments.length === 0) {
    console.error("\n❌ Whisper 没识别出任何句子，可能音频太短或非英语");
    await fs.rm(matDir, { recursive: true });
    process.exit(1);
  }

  const durationSec = Math.round(segments[segments.length - 1].endSec);
  const introSec = detectIntroSec(segments);

  const meta = {
    title,
    source: opts.source,
    level: opts.level,
    durationSec,
    introSec,
    coverGradient: opts.gradient,
    audioFile: "audio.mp3",
    segments,
  };

  await fs.writeFile(path.join(matDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  console.log(`
✅ 导入成功！

   标题:   ${title}
   时长:   ${mins}分${secs}秒
   句子数: ${segments.length}
   目录:   public/listening-materials/${id}/

👉 启动开发服务器后打开: http://localhost:3000/listening/${id}
`);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
