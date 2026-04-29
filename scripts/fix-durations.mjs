#!/usr/bin/env node
// 修复批量导入后的 meta.json：
//  1) 时长除以 2（之前按 64kbps 估算，实际 128kbps）
//  2) 按真实时长重新分级：≤3.5 分钟=初级、≤6 分钟=中级、>6 分钟=高级
//  3) 同步重写 segments 的 startSec/endSec
//
// 装了 ffmpeg/ffprobe 时直接读取真实时长（最准）；否则按 0.5 倍修正。

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = path.join(process.cwd(), "public", "listening-materials");

function getDurationViaFfprobe(mp3Path) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      mp3Path,
    ]);
    let out = "", err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe ${err}`));
      const sec = parseFloat(out.trim());
      if (isNaN(sec)) return reject(new Error("parse failed"));
      resolve(sec);
    });
  });
}

function classifyLevel(durationSec) {
  if (durationSec <= 210) return "beginner";       // ≤3.5 分钟
  if (durationSec <= 360) return "intermediate";   // ≤6 分钟
  return "advanced";
}

const LEVEL_GRADIENT = {
  beginner: "from-yellow-400 via-amber-500 to-orange-500",
  intermediate: "from-sky-400 via-blue-500 to-indigo-600",
  advanced: "from-zinc-700 via-zinc-800 to-zinc-900",
};

async function main() {
  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  const folders = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

  let ffprobeAvailable = true;
  try {
    // 用一个不存在的文件测一下命令是否能调起来
    await new Promise((res, rej) => {
      const p = spawn("ffprobe", ["-version"]);
      p.on("error", rej);
      p.on("close", (c) => (c === 0 ? res() : rej()));
    });
  } catch {
    ffprobeAvailable = false;
    console.log("ℹ️  ffprobe 没装，按 0.5 倍修正（仍然够用）");
  }

  const summary = { beginner: [], intermediate: [], advanced: [] };

  for (const id of folders) {
    const metaPath = path.join(ROOT, id, "meta.json");
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(meta.segments)) continue;

    const mp3Path = path.join(ROOT, id, meta.audioFile ?? "audio.mp3");
    let realDur;
    if (ffprobeAvailable) {
      try {
        realDur = await getDurationViaFfprobe(mp3Path);
      } catch {
        realDur = meta.durationSec / 2;
      }
    } else {
      realDur = meta.durationSec / 2;
    }

    const ratio = realDur / meta.durationSec;
    meta.segments = meta.segments.map((s) => ({
      ...s,
      startSec: Math.round(s.startSec * ratio * 10) / 10,
      endSec: Math.round(s.endSec * ratio * 10) / 10,
    }));
    if (meta.segments.length > 0) {
      meta.segments[meta.segments.length - 1].endSec = Math.round(realDur * 10) / 10;
    }
    meta.durationSec = Math.round(realDur);
    meta.level = classifyLevel(realDur);
    meta.coverGradient = LEVEL_GRADIENT[meta.level];

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
    summary[meta.level].push({ id, title: meta.title, dur: meta.durationSec });
  }

  console.log("\n修复完成。新难度分布：");
  for (const lvl of ["beginner", "intermediate", "advanced"]) {
    console.log(`\n${lvl}（${summary[lvl].length} 篇）:`);
    summary[lvl]
      .sort((a, b) => a.dur - b.dur)
      .forEach((s) => {
        const m = Math.floor(s.dur / 60);
        const sec = s.dur % 60;
        console.log(`  · ${m}:${String(sec).padStart(2, "0")}  ${s.title.slice(0, 60)}`);
      });
  }

  return summary;
}

const summary = await main();
// 同步刷新桌面清单
import("./gen-desktop-list.mjs").then((m) => m.regenerate(summary)).catch(() => {});
