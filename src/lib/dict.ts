import Database from "better-sqlite3";
import path from "node:path";
import { normalizeDefinition, normalizeNewlines } from "./pos";

// 词形变化（对应 ECDICT exchange 字段：d/p/i/3/s/r/t/0/1）
export interface WordExchange {
  past?: string;              // d 过去式
  pastParticiple?: string;    // p 过去分词
  presentParticiple?: string; // i 现在分词
  thirdPerson?: string;       // 3 第三人称单数
  plural?: string;            // s 复数
  comparative?: string;       // r 比较级
  superlative?: string;       // t 最高级
  lemma?: string;             // 0 原形
  lemmaType?: string;         // 1 原形类型说明
}

export interface WordEntry {
  word: string;
  phonetic: string | null;
  definition: string | null;   // 英文释义
  translation: string | null;  // 中文释义（可能含多个义项，用 \n 分隔）
  pos: string | null;          // 词性标注
  collins: number;             // 柯林斯星级 0-5
  oxford: number;              // 牛津 3000 标记 0/1
  tag: string[];               // 考试标签：cet4/cet6/ky/toefl/ielts/gre 等
  bnc: number;                 // BNC 词频排名
  frq: number;                 // COCA 词频排名
  exchange: WordExchange;      // 词形变化
  examples: string[];          // 例句（来自 Free Dictionary API）
}

// 数据库 raw 行（SQLite 返回的原始结构）
interface RawRow {
  word: string;
  phonetic: string | null;
  definition: string | null;
  translation: string | null;
  pos: string | null;
  collins: number;
  oxford: number;
  tag: string | null;
  bnc: number;
  frq: number;
  exchange: string | null;
}

// 单例：进程内只开一次连接，被多次查词复用
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = path.join(process.cwd(), "data/ecdict.db");
  _db = new Database(dbPath, { readonly: true, fileMustExist: true });
  _db.pragma("journal_mode = MEMORY");
  return _db;
}

const exchangeKeyMap: Record<string, keyof WordExchange> = {
  d: "past",
  p: "pastParticiple",
  i: "presentParticiple",
  "3": "thirdPerson",
  s: "plural",
  r: "comparative",
  t: "superlative",
  "0": "lemma",
  "1": "lemmaType",
};

function parseExchange(raw: string | null): WordExchange {
  if (!raw) return {};
  const result: WordExchange = {};
  for (const part of raw.split("/")) {
    const [key, value] = part.split(":");
    const mapped = exchangeKeyMap[key];
    if (mapped && value) result[mapped] = value;
  }
  return result;
}

export function lookupWord(word: string): WordEntry | null {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const row = getDb()
    .prepare(
      `SELECT word, phonetic, definition, translation, pos,
              collins, oxford, tag, bnc, frq, exchange
       FROM words
       WHERE word = ? COLLATE NOCASE`
    )
    .get(trimmed) as RawRow | undefined;

  if (!row) return null;

  return {
    word: row.word,
    phonetic: row.phonetic,
    definition: normalizeDefinition(row.definition),
    translation: normalizeNewlines(row.translation),
    pos: row.pos,
    collins: row.collins,
    oxford: row.oxford,
    tag: row.tag ? row.tag.split(/\s+/).filter(Boolean) : [],
    bnc: row.bnc,
    frq: row.frq,
    exchange: parseExchange(row.exchange),
    examples: [], // 例句由 API 路由从 Free Dictionary API 补充
  };
}
