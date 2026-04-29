#!/usr/bin/env node
// 用智谱 GLM-4-Flash 按 CEFR 给所有素材重新分级（按词汇 + 语法 + 习语难度）。
// 用法: node scripts/classify-difficulty.mjs
// 需要 .env.local 里有 ZHIPU_API_KEY=...

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public", "listening-materials");
const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4-flash";

async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    txt.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
  } catch {}
}

const SYSTEM_PROMPT = `你是 CEFR 英语水平评估专家。给定一段英文文本，根据 **词汇难度、语法复杂度、习语 / 比喻、抽象程度** 综合判断 CEFR 等级。

严格只返回 JSON，不要 markdown 围栏，不要任何解释文字。格式：
{
  "cefr": "A2" | "B1" | "B2" | "C1" | "C2",
  "reason": "用中文一句话说明，不超过 30 字，例如：'含大量习语和比喻'、'词汇基础句式简单' 等"
}`;

// CEFR → 三档难度映射（针对 VOA Special English 池调整）
function mapCEFRToLevel(cefr) {
  if (["A1", "A2", "B1"].includes(cefr)) return "beginner";
  if (cefr === "B2") return "intermediate";
  return "advanced"; // C1, C2
}

async function classify(text) {
  const r = await fetch(ZHIPU_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 4000) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  const data = await r.json();
  let content = data.choices?.[0]?.message?.content ?? "";
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(content);
}

const LEVEL_GRADIENT = {
  beginner: "from-yellow-400 via-amber-500 to-orange-500",
  intermediate: "from-sky-400 via-blue-500 to-indigo-600",
  advanced: "from-zinc-700 via-zinc-800 to-zinc-900",
};

async function main() {
  await loadEnv();
  if (!process.env.ZHIPU_API_KEY) {
    console.error("❌ .env.local 没有 ZHIPU_API_KEY");
    process.exit(1);
  }

  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  const folders = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

  const summary = { beginner: [], intermediate: [], advanced: [] };
  let i = 0;
  for (const id of folders) {
    i++;
    const metaPath = path.join(ROOT, id, "meta.json");
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(meta.segments) || meta.segments.length === 0) continue;
    const text = meta.segments.map((s) => s.text).join(" ");
    process.stdout.write(`[${i}/${folders.length}] ${meta.title.slice(0, 50).padEnd(50)} `);
    try {
      const r = await classify(text);
      const level = mapCEFRToLevel(r.cefr);
      meta.level = level;
      meta.cefr = r.cefr;
      meta.difficultyReason = r.reason;
      meta.coverGradient = LEVEL_GRADIENT[level];
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
      console.log(`→ ${r.cefr} (${level}) · ${r.reason ?? ""}`);
      summary[level].push({ id, title: meta.title, dur: meta.durationSec, segCount: meta.segments.length, cefr: r.cefr });
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  console.log("\n📊 新分布：");
  for (const lvl of ["beginner", "intermediate", "advanced"]) {
    console.log(`  ${lvl}: ${summary[lvl].length} 篇`);
  }

  // 重写桌面清单
  const { regenerate } = await import("./gen-desktop-list.mjs");
  await regenerate();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
