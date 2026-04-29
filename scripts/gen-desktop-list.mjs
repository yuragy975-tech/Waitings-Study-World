// 重新生成桌面 markdown 清单（被 fix-durations 调用，也可独立运行）

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.join(process.cwd(), "public", "listening-materials");

function fmtDuration(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const LEVEL_LABEL = {
  beginner: "🟢 初级",
  intermediate: "🟡 中级",
  advanced: "🔴 高级",
};

export async function regenerate(summary) {
  if (!summary) {
    summary = { beginner: [], intermediate: [], advanced: [] };
    const dirs = await fs.readdir(ROOT, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const metaPath = path.join(ROOT, d.name, "meta.json");
      try {
        const m = JSON.parse(await fs.readFile(metaPath, "utf8"));
        const lvl = m.level && summary[m.level] ? m.level : "intermediate";
        summary[lvl].push({
          id: d.name,
          title: m.title,
          dur: m.durationSec,
          segCount: m.segments?.length ?? 0,
          cefr: m.cefr,
          reason: m.difficultyReason,
        });
      } catch {}
    }
  }

  let md = `# 啃料素材清单\n\n`;
  md += `_生成时间：${new Date().toLocaleString("zh-CN")}_  \n`;
  md += `_来源：21voa.com（VOA Learning English 镜像）_\n\n`;
  const total = Object.values(summary).reduce((s, l) => s + l.length, 0);
  md += `共 **${total}** 篇 —— 初级 ${summary.beginner.length} · 中级 ${summary.intermediate.length} · 高级 ${summary.advanced.length}\n\n`;
  md += `打开你的网站：http://localhost:3000/listening\n\n`;
  md += `---\n\n`;

  for (const lvl of ["beginner", "intermediate", "advanced"]) {
    md += `## ${LEVEL_LABEL[lvl]} — ${summary[lvl].length} 篇\n\n`;
    if (summary[lvl].length === 0) {
      md += `_这一档暂无素材。_\n\n`;
      continue;
    }
    md += `| # | 标题 | CEFR | 时长 | 句数 | 难度备注 | 训练 |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    summary[lvl]
      .sort((a, b) => (a.cefr ?? "").localeCompare(b.cefr ?? "") || (a.dur ?? 0) - (b.dur ?? 0))
      .forEach((r, idx) => {
        const localUrl = `http://localhost:3000/listening/${r.id}`;
        md += `| ${idx + 1} | ${r.title} | ${r.cefr ?? "-"} | ${fmtDuration(r.dur ?? 0)} | ${r.segCount ?? "?"} | ${r.reason ?? ""} | [打开](${localUrl}) |\n`;
      });
    md += `\n`;
  }

  md += `---\n\n## 怎么用\n\n`;
  md += `1. 在终端启动开发服务器：\`cd ~/projects/shengci-baodian && npm run dev\`\n`;
  md += `2. 浏览器打开 http://localhost:3000/listening\n`;
  md += `3. 点任一卡片进入训练页\n\n`;
  md += `## 删除某一篇\n\n直接删 \`public/listening-materials/<id>/\` 文件夹即可。\n\n`;
  md += `## 加新素材（一行命令）\n\n\`\`\`bash\nnode scripts/import-21voa.mjs <文章URL> --level intermediate --gradient ocean\n\`\`\`\n`;

  const outPath = path.join(os.homedir(), "Desktop", "啃料素材清单.md");
  await fs.writeFile(outPath, md);
  console.log(`\n📄 桌面清单已更新: ${outPath}`);
}

// 允许独立运行
if (process.argv[1] && process.argv[1].endsWith("gen-desktop-list.mjs")) {
  regenerate();
}
