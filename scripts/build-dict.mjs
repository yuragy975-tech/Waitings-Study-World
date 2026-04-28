// 一次性脚本：把 ECDICT 的 ecdict.csv 导入成精简的 SQLite 数据库
// 用法： node scripts/build-dict.mjs

import { createReadStream, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "csv-parse";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV = join(ROOT, "data/raw/ecdict.csv");
const DB = join(ROOT, "data/ecdict.db");

if (!existsSync(CSV)) {
  console.error(`找不到源 CSV: ${CSV}`);
  process.exit(1);
}

if (existsSync(DB)) {
  unlinkSync(DB);
  console.log("已删除旧的 SQLite，开始重建");
}

const db = new Database(DB);
db.pragma("journal_mode = MEMORY");
db.pragma("synchronous = OFF");

db.exec(`
  CREATE TABLE words (
    word        TEXT PRIMARY KEY COLLATE NOCASE,
    phonetic    TEXT,
    definition  TEXT,
    translation TEXT,
    pos         TEXT,
    collins     INTEGER DEFAULT 0,
    oxford      INTEGER DEFAULT 0,
    tag         TEXT,
    bnc         INTEGER DEFAULT 0,
    frq         INTEGER DEFAULT 0,
    exchange    TEXT
  );
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO words
    (word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) insert.run(...r);
});

const parser = createReadStream(CSV).pipe(
  parse({
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })
);

const BATCH = 2000;
let buf = [];
let total = 0;
let kept = 0;
const t0 = Date.now();

for await (const row of parser) {
  total++;
  const word = (row.word || "").trim();
  const translation = (row.translation || "").trim();
  const phonetic = (row.phonetic || "").trim();
  const tag = (row.tag || "").trim();
  const frq = parseInt(row.frq, 10) || 0;

  // 过滤规则：必须有中文释义、必须是干净英文单词、必须是"有用"的词
  if (!translation) continue;
  if (!/^[A-Za-z][A-Za-z'-]*$/.test(word)) continue;
  if (word.length < 2 || word.length > 25) continue;
  // 至少满足一项：有音标 / 有考试标签 / 在词频前 2 万
  if (!phonetic && !tag && !(frq > 0 && frq <= 20000)) continue;

  buf.push([
    word,
    phonetic || null,
    (row.definition || "").trim() || null,
    translation,
    (row.pos || "").trim() || null,
    parseInt(row.collins, 10) || 0,
    parseInt(row.oxford, 10) || 0,
    tag || null,
    parseInt(row.bnc, 10) || 0,
    frq,
    (row.exchange || "").trim() || null,
  ]);
  kept++;

  if (buf.length >= BATCH) {
    insertMany(buf);
    buf = [];
    if (total % 50000 === 0) {
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`已处理 ${total} 行，保留 ${kept}，耗时 ${sec}s`);
    }
  }
}
if (buf.length) insertMany(buf);

db.exec(`CREATE INDEX idx_tag ON words(tag);`);
db.exec(`CREATE INDEX idx_frq ON words(frq);`);

const count = db.prepare("SELECT COUNT(*) AS n FROM words").get().n;
const sec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n========== 导入完成 ==========`);
console.log(`CSV 总行数:  ${total}`);
console.log(`保留进库:    ${count}（过滤掉 ${total - count} 条无中文释义的）`);
console.log(`耗时:        ${sec}s`);

db.close();
