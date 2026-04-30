#!/usr/bin/env node
// 为所有素材检测前奏并写入 introSec
// 用法: node scripts/fix-intro.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { detectIntroSec } from "./lib/detect-intro.mjs";

const ROOT = path.join(process.cwd(), "public", "listening-materials");

async function main() {
  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  const folders = dirs.filter((d) => d.isDirectory()).map((d) => d.name).sort();

  let updated = 0;
  for (const id of folders) {
    const metaPath = path.join(ROOT, id, "meta.json");
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      continue;
    }

    const introSec = detectIntroSec(meta.segments || []);
    const old = meta.introSec ?? 0;

    if (introSec !== old) {
      meta.introSec = introSec;
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
      console.log(`${introSec > 0 ? "🎵" : "  "} ${id}: ${old}s → ${introSec}s`);
      updated++;
    }
  }

  console.log(`\n✅ 更新了 ${updated} 个素材的 introSec`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
