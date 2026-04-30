#!/usr/bin/env node
// 批量导入 BBC 6 Minute English 音频
// 用法: node scripts/import-bbc-batch.mjs [--limit N]
//   --limit N  只导入前 N 篇（用来测试）

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const AUDIO_DIR = path.join(
  os.homedir(),
  "Desktop",
  "BBC六分钟（2025+2026持续更新）",
  "6、配套音频",
);

const ROOT = path.join(process.cwd(), "public", "listening-materials");
const MODEL_DIR = path.join(os.homedir(), ".whisper-models");
const MODEL_NAME = "ggml-base.en.bin";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);
const HF_ENDPOINT = process.env.HF_ENDPOINT ?? "https://hf-mirror.com";
const MODEL_URL = `${HF_ENDPOINT}/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;

const GRADIENT = "from-sky-400 via-blue-500 to-indigo-600";

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args);
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
  try { await run("which", [cmd]); return true; } catch { return false; }
}

async function ensureModel() {
  try { await fs.access(MODEL_PATH); return; } catch {}
  await fs.mkdir(MODEL_DIR, { recursive: true });
  console.log("📥 下载 Whisper 模型（~142MB）...");
  const r = await fetch(MODEL_URL);
  if (!r.ok) throw new Error(`模型下载失败 HTTP ${r.status}`);
  await fs.writeFile(MODEL_PATH, Buffer.from(await r.arrayBuffer()));
  console.log("✅ 模型已存");
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

async function transcribe(mp3Path, matDir) {
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

function parseFileName(name) {
  const m = name.match(/^(\d+)、(.+)\.mp3$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const rawTitle = m[2].trim();
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  const id = `bbc-6min-${String(num).padStart(3, "0")}-${rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}`;
  return { num, title, id };
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  if (!(await cmdExists("ffmpeg")) || !(await cmdExists("whisper-cli"))) {
    console.error("❌ 请先安装: brew install ffmpeg whisper-cpp");
    process.exit(1);
  }
  await ensureModel();

  const files = (await fs.readdir(AUDIO_DIR))
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => ({ file: f, ...parseFileName(f) }))
    .filter((f) => f.num != null)
    .sort((a, b) => a.num - b.num);

  const todo = files.slice(0, limit);
  console.log(`\n📋 共 ${files.length} 个音频，本次处理 ${todo.length} 个\n`);

  let ok = 0, skip = 0, fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const { file, num, title, id } = todo[i];
    const label = `[${i + 1}/${todo.length}]`;
    const matDir = path.join(ROOT, id);

    try {
      await fs.access(path.join(matDir, "meta.json"));
      console.log(`${label} ⏭️  已存在: ${title}`);
      skip++;
      continue;
    } catch {}

    process.stdout.write(`${label} 🤖 ${title} ... `);
    await fs.mkdir(matDir, { recursive: true });

    try {
      const srcPath = path.join(AUDIO_DIR, file);
      await fs.copyFile(srcPath, path.join(matDir, "audio.mp3"));

      const segments = await transcribe(path.join(matDir, "audio.mp3"), matDir);
      if (segments.length === 0) throw new Error("Whisper 未识别出句子");

      const durationSec = Math.round(segments[segments.length - 1].endSec);

      const level = num <= 20 ? "beginner" : num <= 40 ? "intermediate" : "advanced";

      const meta = {
        title,
        source: "BBC 6 Minute English",
        level,
        durationSec,
        coverGradient: GRADIENT,
        audioFile: "audio.mp3",
        segments,
      };
      await fs.writeFile(path.join(matDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      console.log(`✅ ${mins}:${String(secs).padStart(2, "0")} · ${segments.length} 句`);
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      await fs.rm(matDir, { recursive: true }).catch(() => {});
      fail++;
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  console.log(`\n✅ 全部完成（耗时 ${elapsedMin}分${elapsedSec}秒）`);
  console.log(`   成功 ${ok} / 跳过 ${skip} / 失败 ${fail} / 总 ${todo.length}`);
  console.log(`\n👉 打开 http://localhost:3000/listening 查看`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
