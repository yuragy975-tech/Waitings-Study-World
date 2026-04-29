#!/usr/bin/env node
// 用 whisper.cpp 对所有素材做时间对齐。
// 前置：brew install ffmpeg whisper-cpp
// 模型：自动下载 ggml-base.en.bin（142MB，仅英文，对 VOA 类清晰录音足够准）到 ~/.whisper-models/
//
// 用法: node scripts/align-with-whisper.mjs [--id <materialId>] [--keep-text]
//   --id: 只对一篇做（用来调试）
//   --keep-text: 保留原 21voa 文本，只覆盖时间戳（按索引配对，数量接近时启用）

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const ROOT = path.join(process.cwd(), "public", "listening-materials");
const MODEL_DIR = path.join(os.homedir(), ".whisper-models");
const MODEL_NAME = "ggml-base.en.bin";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);
// 优先用国内镜像；国外用户可设环境变量 HF_ENDPOINT=https://huggingface.co
const HF_ENDPOINT = process.env.HF_ENDPOINT ?? "https://hf-mirror.com";
const MODEL_URL = `${HF_ENDPOINT}/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;

function parseArgs() {
  const a = process.argv.slice(2);
  const flag = (n) => {
    const i = a.indexOf(`--${n}`);
    if (i < 0) return undefined;
    const next = a[i + 1];
    return next && !next.startsWith("--") ? next : true;
  };
  return { id: flag("id"), keepText: !!flag("keep-text") };
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

async function exists(cmd) {
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

async function alignOne(dir, mp3Path) {
  const wavPath = path.join(dir, "_tmp.wav");
  const sentPrefix = path.join(dir, "_w_sent");
  const wordPrefix = path.join(dir, "_w_word");
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3Path, "-ar", "16000", "-ac", "1", wavPath]);

  // Pass 1：句子级
  await run("whisper-cli", [
    "-m", MODEL_PATH,
    "-f", wavPath,
    "-l", "en",
    "-osrt",
    "-of", sentPrefix,
  ]);
  const sentences = parseSrt(await fs.readFile(sentPrefix + ".srt", "utf8"));

  // Pass 2：单词级（每个词独立一行）
  await run("whisper-cli", [
    "-m", MODEL_PATH,
    "-f", wavPath,
    "-l", "en",
    "-ml", "1",
    "--split-on-word",
    "-osrt",
    "-of", wordPrefix,
  ]);
  const words = parseSrt(await fs.readFile(wordPrefix + ".srt", "utf8"));

  // 把单词归到对应句子里
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
  const { id: onlyId, keepText } = parseArgs();
  if (!(await exists("ffmpeg"))) {
    console.error("❌ ffmpeg 没装。请先: brew install ffmpeg");
    process.exit(1);
  }
  if (!(await exists("whisper-cli"))) {
    console.error("❌ whisper-cli 没装。请先: brew install whisper-cpp");
    process.exit(1);
  }
  await ensureModel();

  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  let folders = dirs.filter((d) => d.isDirectory()).map((d) => d.name);
  if (onlyId) folders = folders.filter((f) => f === onlyId);
  if (folders.length === 0) {
    console.error("❌ 没找到要处理的素材目录");
    process.exit(1);
  }

  let i = 0, ok = 0, fail = 0;
  for (const id of folders) {
    i++;
    const matDir = path.join(ROOT, id);
    const mp3Path = path.join(matDir, "audio.mp3");
    const metaPath = path.join(matDir, "meta.json");
    try {
      await fs.access(mp3Path);
    } catch {
      console.log(`[${i}/${folders.length}] ${id} - 跳过（无 mp3）`);
      continue;
    }
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      console.log(`[${i}/${folders.length}] ${id} - 跳过（meta 错误）`);
      continue;
    }
    const oldCount = meta.segments?.length ?? 0;
    const titleShort = (meta.title ?? id).slice(0, 50).padEnd(50);
    process.stdout.write(`[${i}/${folders.length}] ${titleShort} `);
    try {
      const aligned = await alignOne(matDir, mp3Path);
      if (aligned.length === 0) throw new Error("whisper 输出为空");

      let segments;
      const closeCount =
        Math.abs(oldCount - aligned.length) / Math.max(oldCount, 1) < 0.2;
      if (keepText && closeCount) {
        // 保留原文本，只覆盖时间戳（按索引配对）。逐词高亮在这种模式下不可用。
        const minLen = Math.min(oldCount, aligned.length);
        segments = [];
        for (let j = 0; j < minLen; j++) {
          segments.push({
            startSec: aligned[j].startSec,
            endSec: aligned[j].endSec,
            text: meta.segments[j].text,
          });
        }
      } else {
        // 直接用 whisper 的分段（最准）+ 逐词时间戳
        segments = aligned;
      }

      meta.segments = segments;
      meta.durationSec = Math.round(segments[segments.length - 1].endSec);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
      console.log(`✅ ${oldCount} → ${segments.length} 段, ${meta.durationSec}s`);
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message?.slice(-200) ?? e}`);
      fail++;
    }
  }
  console.log(`\n完成: ${ok} 成功 / ${fail} 失败`);
  if (ok > 0) {
    const { regenerate } = await import("./gen-desktop-list.mjs");
    await regenerate();
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
