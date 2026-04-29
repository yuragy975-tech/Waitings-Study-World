// 21voa 单篇文章导入核心逻辑（被 import-21voa.mjs 和 import-21voa-batch.mjs 共用）

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export const GRADIENTS = {
  warm: "from-amber-400 via-orange-500 to-rose-500",
  ocean: "from-sky-400 via-blue-500 to-indigo-600",
  nature: "from-emerald-400 via-teal-500 to-cyan-600",
  art: "from-purple-400 via-fuchsia-500 to-pink-500",
  sun: "from-yellow-400 via-amber-500 to-orange-500",
  dark: "from-zinc-700 via-zinc-800 to-zinc-900",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function fetchHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  try {
    return new TextDecoder("gbk", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"');
}

export function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return "Untitled";
  return decodeEntities(m[1])
    .replace(/^VOA\s+(Special English|English Learning)\s*[-–|]\s*/i, "")
    .replace(/\s*[-|–—]\s*(21VOA|慢速英语网|VOA[^]*)$/i, "")
    .trim();
}

function extractMp3Url(html, pageUrl) {
  const m = html.match(/https?:\/\/[^\s"'<>]+\.mp3/i);
  if (m) return m[0];
  const m2 = html.match(/["']([^"'<>]+\.mp3)["']/i);
  if (m2) return new URL(m2[1], pageUrl).toString();
  return null;
}

function extractEnglishParagraphs(html) {
  const blocks = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  const cleaned = blocks
    .map((b) => decodeEntities(stripTags(b)).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return cleaned.filter((b) => {
    const ascii = (b.match(/[A-Za-z]/g) || []).length;
    return b.length > 20 && ascii / b.length > 0.5;
  });
}

function splitSentences(text) {
  const PROTECT = ["Mr", "Mrs", "Ms", "Dr", "Prof", "St", "Jr", "Sr", "U.S", "U.K", "Inc", "Ltd", "vs", "e.g", "i.e"];
  let safe = text;
  PROTECT.forEach((w) => {
    safe = safe.replace(new RegExp(`\\b${w.replace(/\./g, "\\.")}\\.`, "g"), `${w}<DOT>`);
  });
  const matches = safe.match(/[^.!?]+[.!?]+/g) || [];
  return matches.map((s) => s.trim().replace(/<DOT>/g, ".")).filter((s) => s.length > 5);
}

function defaultId(url) {
  const last = url.match(/\/([^\/?#]+?)(\.html?|\.htm)?(?:[?#]|$)/i)?.[1];
  if (last) return last.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  return `voa-${Date.now()}`;
}

async function getDurationViaFfprobe(mp3Path) {
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
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}: ${err}`));
      const sec = parseFloat(out.trim());
      if (isNaN(sec)) return reject(new Error("ffprobe parse failed"));
      resolve(sec);
    });
  });
}

/**
 * 导入一篇文章。返回 { id, title, durationSec, segmentCount, dir, mp3Url, skipped, reason }
 */
export async function importArticle({ url, level = "intermediate", gradient = GRADIENTS.ocean, id: rawId, projectRoot }) {
  const html = await fetchHtml(url);
  const title = extractTitle(html);
  const mp3Url = extractMp3Url(html, url);
  if (!mp3Url) return { url, title, skipped: true, reason: "未找到 mp3 链接" };

  const paragraphs = extractEnglishParagraphs(html);
  if (paragraphs.length === 0) return { url, title, skipped: true, reason: "未解析到英文段落" };

  let fullText = paragraphs.join(" ");
  const wisIdx = fullText.search(/Words?\s+in\s+This\s+Story/i);
  if (wisIdx > 0) fullText = fullText.slice(0, wisIdx);

  const sentences = splitSentences(fullText);
  if (sentences.length === 0) return { url, title, skipped: true, reason: "未切到句子" };

  const id = (rawId ?? defaultId(url)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  const dir = path.join(projectRoot, "public", "listening-materials", id);
  await fs.mkdir(dir, { recursive: true });

  const mp3Path = path.join(dir, "audio.mp3");
  const audioResp = await fetch(mp3Url, { headers: { "User-Agent": UA, Referer: url } });
  if (!audioResp.ok) return { url, title, skipped: true, reason: `mp3 HTTP ${audioResp.status}` };
  const audioBuf = Buffer.from(await audioResp.arrayBuffer());
  await fs.writeFile(mp3Path, audioBuf);

  let durationSec;
  try {
    durationSec = await getDurationViaFfprobe(mp3Path);
  } catch {
    // VOA Special English mp3 多为 128kbps；ffmpeg 没装时按这个估
    durationSec = (audioBuf.length * 8) / 128000;
  }

  const per = durationSec / sentences.length;
  const segments = sentences.map((text, i) => ({
    startSec: Math.round(i * per * 10) / 10,
    endSec: Math.round((i + 1) * per * 10) / 10,
    text,
  }));
  segments[segments.length - 1].endSec = Math.round(durationSec * 10) / 10;

  const meta = {
    title,
    source: "VOA Learning English (via 21voa.com)",
    level,
    durationSec: Math.round(durationSec),
    coverGradient: gradient,
    audioFile: "audio.mp3",
    segments,
  };
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  return { url, id, title, durationSec: Math.round(durationSec), segmentCount: sentences.length, dir, mp3Url, skipped: false };
}

/**
 * 抓 21voa 的分类列表页，返回该分类的最新 N 篇文章 URL。
 */
export async function listArticlesInCategory(categoryPath, limit = 5) {
  const url = "https://www.21voa.com" + categoryPath;
  const html = await fetchHtml(url);
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+\.html?)["'][^>]*>([^<]+)<\/a>/gi)].map((m) => ({
    href: m[1],
    text: decodeEntities(m[2]).trim(),
  }));
  // 排除 nav 项 / 重复 / 自己；保留 special_english 或 english_learning 文章
  const articles = links.filter((l) => /\/(special_english|english_learning)\/[^/]+\.html?$/i.test(l.href));
  // 去重
  const seen = new Set();
  const uniq = [];
  for (const a of articles) {
    if (seen.has(a.href)) continue;
    seen.add(a.href);
    uniq.push(a);
    if (uniq.length >= limit) break;
  }
  return uniq.map((a) => ({
    url: new URL(a.href, "https://www.21voa.com").toString(),
    title: a.text,
  }));
}
