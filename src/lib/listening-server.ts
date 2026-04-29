import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Level, Material, Segment } from "@/lib/listening";

const ROOT = path.join(process.cwd(), "public", "listening-materials");

interface MetaJson {
  title: string;
  source: string;
  level: Level;
  cefr?: string;
  difficultyReason?: string;
  durationSec: number;
  coverGradient: string;
  audioFile?: string; // 默认 audio.mp3
  segments: Segment[];
}

function isValidLevel(v: unknown): v is Level {
  return v === "beginner" || v === "intermediate" || v === "advanced";
}

async function readMeta(id: string): Promise<Material | null> {
  const metaPath = path.join(ROOT, id, "meta.json");
  let raw: string;
  try {
    raw = await fs.readFile(metaPath, "utf8");
  } catch {
    return null;
  }
  let parsed: Partial<MetaJson>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[listening] meta.json 解析失败: ${id}`);
    return null;
  }
  if (
    typeof parsed.title !== "string" ||
    typeof parsed.source !== "string" ||
    !isValidLevel(parsed.level) ||
    typeof parsed.durationSec !== "number" ||
    typeof parsed.coverGradient !== "string" ||
    !Array.isArray(parsed.segments)
  ) {
    console.warn(`[listening] meta.json 字段缺失: ${id}`);
    return null;
  }
  const audioFile = parsed.audioFile ?? "audio.mp3";
  return {
    id,
    title: parsed.title,
    source: parsed.source,
    level: parsed.level,
    cefr: parsed.cefr,
    difficultyReason: parsed.difficultyReason,
    durationSec: parsed.durationSec,
    coverGradient: parsed.coverGradient,
    audioUrl: `/listening-materials/${id}/${audioFile}`,
    segments: parsed.segments,
  };
}

export async function loadAllMaterials(): Promise<Material[]> {
  let entries: string[];
  try {
    const dir = await fs.readdir(ROOT, { withFileTypes: true });
    entries = dir.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  const all = await Promise.all(entries.map(readMeta));
  const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
  return all
    .filter((m): m is Material => m !== null)
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
        (a.cefr ?? "").localeCompare(b.cefr ?? "") ||
        a.durationSec - b.durationSec,
    );
}

export async function loadMaterial(id: string): Promise<Material | null> {
  // 防路径穿越：禁止 .. / 斜杠 / 反斜杠
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return readMeta(id);
}
