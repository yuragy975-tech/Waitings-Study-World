#!/usr/bin/env node
// 批量抓取 21voa 三档难度的最新文章，并在桌面生成清单 markdown
// 用法: node scripts/import-21voa-batch.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { importArticle, listArticlesInCategory, GRADIENTS } from "./lib/voa-import.mjs";

const PLAN = [
  {
    level: "beginner",
    label: "🟢 初级",
    gradient: GRADIENTS.sun,
    target: 10,
    categories: [
      "/learn_a_word.html",
      "/english_in_a_minute.html",
      "/how_to_say_it.html",
      "/everyday_grammar.html",
    ],
  },
  {
    level: "intermediate",
    label: "🟡 中级",
    gradient: GRADIENTS.ocean,
    target: 10,
    categories: [
      "/technology_report.html",
      "/health_report.html",
      "/education_report.html",
      "/science_in_the_news.html",
    ],
  },
  {
    level: "advanced",
    label: "🔴 高级",
    gradient: GRADIENTS.dark,
    target: 10,
    categories: [
      "/words_and_their_stories.html",
      "/american_stories.html",
      "/this_is_america.html",
      "/u_s_history.html",
    ],
  },
];

async function gatherUrlsForLevel(plan) {
  const collected = [];
  const seen = new Set();
  for (const cat of plan.categories) {
    if (collected.length >= plan.target) break;
    try {
      const arts = await listArticlesInCategory(cat, plan.target);
      for (const a of arts) {
        if (collected.length >= plan.target) break;
        if (seen.has(a.url)) continue;
        seen.add(a.url);
        collected.push({ ...a, sourceCategory: cat });
      }
    } catch (e) {
      console.warn(`   ⚠️  分类抓取失败 ${cat}: ${e.message}`);
    }
  }
  return collected;
}

async function main() {
  const projectRoot = process.cwd();
  console.log("📋 阶段 1: 收集文章列表");
  const allTasks = [];
  for (const plan of PLAN) {
    console.log(`\n${plan.label}（${plan.level}, 目标 ${plan.target} 篇）`);
    const items = await gatherUrlsForLevel(plan);
    items.forEach((it) => {
      console.log(`  · ${it.title.slice(0, 60)}`);
      allTasks.push({ ...it, level: plan.level, label: plan.label, gradient: plan.gradient });
    });
  }

  if (allTasks.length === 0) {
    console.error("❌ 没收集到任何文章，停止。");
    process.exit(1);
  }

  console.log(`\n📋 共 ${allTasks.length} 篇待处理`);
  console.log("\n📥 阶段 2: 逐篇下载（每篇 2-5 秒）");

  const results = [];
  let i = 0;
  for (const t of allTasks) {
    i++;
    process.stdout.write(`  [${i}/${allTasks.length}] ${t.title.slice(0, 50).padEnd(50)} `);
    try {
      const r = await importArticle({
        url: t.url,
        level: t.level,
        gradient: t.gradient,
        projectRoot,
      });
      if (r.skipped) {
        console.log(`⏭️  ${r.reason}`);
        results.push({ ...t, ...r });
      } else {
        console.log(`✅ ${r.durationSec}s`);
        results.push({ ...t, ...r });
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      results.push({ ...t, skipped: true, reason: e.message });
    }
  }

  // 生成桌面清单
  const desktop = path.join(os.homedir(), "Desktop");
  const outPath = path.join(desktop, "啃料素材清单.md");
  const ok = results.filter((r) => !r.skipped);
  const fail = results.filter((r) => r.skipped);

  let md = `# 啃料素材清单\n\n`;
  md += `_生成时间：${new Date().toLocaleString("zh-CN")}_  \n`;
  md += `_来源：21voa.com（VOA Learning English 镜像）_\n\n`;
  md += `共抓取 **${results.length}** 篇，成功 **${ok.length}**，失败 **${fail.length}**。\n\n`;
  md += `打开你的网站访问：http://localhost:3000/listening\n\n`;
  md += `---\n\n`;

  for (const plan of PLAN) {
    const list = ok.filter((r) => r.level === plan.level);
    md += `## ${plan.label}（${plan.level}）— ${list.length} 篇\n\n`;
    if (list.length === 0) {
      md += `_这一档没成功抓到，可能 21voa 限流或分类结构变了。_\n\n`;
      continue;
    }
    md += `| # | 标题 | 时长 | 句数 | 在网站打开 |\n`;
    md += `|---|---|---|---|---|\n`;
    list.forEach((r, idx) => {
      const dur = `${Math.floor(r.durationSec / 60)}:${String(r.durationSec % 60).padStart(2, "0")}`;
      const localUrl = `http://localhost:3000/listening/${r.id}`;
      md += `| ${idx + 1} | ${r.title} | ${dur} | ${r.segmentCount} | [打开](${localUrl}) |\n`;
    });
    md += `\n`;
  }

  if (fail.length > 0) {
    md += `## ⚠️ 失败 ${fail.length} 篇\n\n`;
    fail.forEach((r) => {
      md += `- ${r.title || r.url} — ${r.reason}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 怎么使用\n\n`;
  md += `1. 在终端启动开发服务器：\`cd ~/projects/shengci-baodian && npm run dev\`\n`;
  md += `2. 浏览器打开 http://localhost:3000/listening\n`;
  md += `3. 点任一卡片进入训练页\n\n`;
  md += `## 怎么删除某一篇\n\n`;
  md += `直接删 \`public/listening-materials/<id>/\` 这个文件夹即可。\n`;

  await fs.writeFile(outPath, md);

  console.log(`\n✅ 全部完成`);
  console.log(`   成功 ${ok.length} / 失败 ${fail.length} / 总 ${results.length}`);
  console.log(`   清单已写入桌面: ${outPath}`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
