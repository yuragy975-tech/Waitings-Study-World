#!/usr/bin/env node
// 按句子词数加权重算时间戳。
// 之前是 总时长 ÷ 句数，每句等长，不准。
// 现在是 每句词数 / 总词数 × 总时长，长句配长时间，跟随光标会准很多。
// 仍然不是真"对齐"（不考虑停顿和语速变化），但已经能用。

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public", "listening-materials");

function wordCount(text) {
  return (text.match(/\b[A-Za-z']+\b/g) ?? []).length;
}

function r(n) {
  return Math.round(n * 10) / 10;
}

async function main() {
  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  let touched = 0;
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const metaPath = path.join(ROOT, d.name, "meta.json");
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(meta.segments) || meta.segments.length < 2) continue;
    const total = meta.durationSec;
    if (!total || total <= 0) continue;

    const counts = meta.segments.map((s) => Math.max(1, wordCount(s.text)));
    const totalWords = counts.reduce((s, c) => s + c, 0);

    let cum = 0;
    meta.segments = meta.segments.map((s, i) => {
      const start = (total * cum) / totalWords;
      cum += counts[i];
      const end = (total * cum) / totalWords;
      return { startSec: r(start), endSec: r(end), text: s.text };
    });
    meta.segments[meta.segments.length - 1].endSec = r(total);

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
    touched++;
  }
  console.log(`✅ 重算了 ${touched} 篇的时间戳（按词数加权）`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
