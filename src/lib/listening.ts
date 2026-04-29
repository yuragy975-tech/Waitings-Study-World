export type Level = "beginner" | "intermediate" | "advanced";

export type Segment = {
  startSec: number;
  endSec: number;
  text: string;
};

export type Material = {
  id: string;
  title: string;
  source: string;
  level: Level;
  cefr?: string;              // A2 / B1 / B2 / C1 / C2
  difficultyReason?: string;  // 中文一句话说明
  durationSec: number;
  coverGradient: string;
  audioUrl: string;
  segments: Segment[];
};

export const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "done", "doing",
  "have", "has", "had", "having",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "i", "you", "he", "she", "it", "we", "they",
  "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their",
  "this", "that", "these", "those",
  "and", "or", "but", "so", "yet", "for", "nor",
  "if", "when", "while", "because", "though", "although", "as", "than",
  "of", "in", "on", "at", "to", "from", "by", "with", "about",
  "into", "onto", "over", "under", "out", "up", "down", "off",
  "what", "which", "who", "whom", "whose", "where", "why", "how",
  "no", "not", "yes", "all", "some", "any", "every", "each",
  "there", "here", "now", "then",
]);

export function isFunctionWord(token: string): boolean {
  return FUNCTION_WORDS.has(token.toLowerCase());
}

export type DisplayMode = "full" | "half" | "blind";

const LEVEL_LABEL: Record<Level, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
};

export function levelLabel(level: Level): string {
  return LEVEL_LABEL[level];
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 素材数据从 public/listening-materials/{id}/meta.json 加载
// 加载逻辑见 src/lib/listening-server.ts
