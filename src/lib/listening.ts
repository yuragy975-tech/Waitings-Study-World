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

export const MATERIALS: Material[] = [
  {
    id: "sample-coffee",
    title: "Why People Love Coffee",
    source: "示例素材（占位）",
    level: "beginner",
    durationSec: 38,
    coverGradient: "from-amber-400 via-orange-500 to-rose-500",
    audioUrl: "/listening-materials/sample-coffee.mp3",
    segments: [
      { startSec: 0, endSec: 6, text: "Coffee is one of the most popular drinks in the world." },
      { startSec: 6, endSec: 13, text: "Many people drink a cup of coffee every morning to wake up." },
      { startSec: 13, endSec: 20, text: "Some people like it black, while others add milk and sugar." },
      { startSec: 20, endSec: 27, text: "Coffee shops have become a place where friends meet and talk." },
      { startSec: 27, endSec: 38, text: "Whether at home or in a café, coffee brings people together." },
    ],
  },
];

export function findMaterial(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id);
}
