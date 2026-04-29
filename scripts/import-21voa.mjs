#!/usr/bin/env node
// 用法: node scripts/import-21voa.mjs <文章URL> [--level beginner|intermediate|advanced] [--gradient warm|ocean|nature|art|sun|dark] [--id xxx]

import { importArticle, GRADIENTS } from "./lib/voa-import.mjs";

function parseArgs(argv) {
  const args = argv.slice(2);
  const url = args.find((a) => a.startsWith("http"));
  const flag = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
  };
  const grad = flag("gradient", "ocean");
  return {
    url,
    level: flag("level", "intermediate"),
    gradient: GRADIENTS[grad] ?? grad,
    id: flag("id", null),
  };
}

async function main() {
  const { url, level, gradient, id } = parseArgs(process.argv);
  if (!url) {
    console.error("用法: node scripts/import-21voa.mjs <文章URL> [--level intermediate] [--gradient ocean] [--id xxx]");
    console.error("可用 gradient: " + Object.keys(GRADIENTS).join(", "));
    process.exit(1);
  }
  if (!["beginner", "intermediate", "advanced"].includes(level)) {
    console.error(`level 必须是 beginner / intermediate / advanced`);
    process.exit(1);
  }
  console.log(`📥 抓: ${url}`);
  const r = await importArticle({ url, level, gradient, id, projectRoot: process.cwd() });
  if (r.skipped) {
    console.error(`❌ 跳过: ${r.reason}`);
    process.exit(1);
  }
  console.log(`✅ ${r.title}`);
  console.log(`   id: ${r.id} · ${r.segmentCount} 句 · ${r.durationSec}s · level=${level}`);
  console.log(`   去 http://localhost:3000/listening 看新素材`);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
