import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../data/ecdict.db"), { readonly: true });

const q = (sql) => db.prepare(sql).get().c;

console.log("总词条:                     ", q(`SELECT COUNT(*) c FROM words`));
console.log("有音标:                     ", q(`SELECT COUNT(*) c FROM words WHERE phonetic IS NOT NULL`));
console.log("有考试标签:                 ", q(`SELECT COUNT(*) c FROM words WHERE tag IS NOT NULL`));
console.log("frq>0 (COCA 词频里):        ", q(`SELECT COUNT(*) c FROM words WHERE frq > 0`));
console.log("bnc>0 (BNC 词频里):         ", q(`SELECT COUNT(*) c FROM words WHERE bnc > 0`));
console.log("纯英文字母 + 长度 2-25:      ", q(`SELECT COUNT(*) c FROM words WHERE word GLOB '[A-Za-z]*' AND LENGTH(word) BETWEEN 2 AND 25`));
console.log("纯英文 + 有音标:             ", q(`
  SELECT COUNT(*) c FROM words
  WHERE phonetic IS NOT NULL
    AND word GLOB '[A-Za-z]*'
    AND LENGTH(word) BETWEEN 2 AND 25
`));
console.log("纯英文 + (有音标 OR 有标签 OR frq<=20000):", q(`
  SELECT COUNT(*) c FROM words
  WHERE word GLOB '[A-Za-z]*'
    AND LENGTH(word) BETWEEN 2 AND 25
    AND (phonetic IS NOT NULL OR tag IS NOT NULL OR (frq > 0 AND frq <= 20000))
`));

console.log("\n--- 看一些垃圾条目长啥样 ---");
for (const r of db.prepare(`SELECT word FROM words WHERE word NOT GLOB '[A-Za-z]*' LIMIT 5`).all()) {
  console.log("  ", r.word);
}

console.log("\n--- 太长的条目（短语/句子）---");
for (const r of db.prepare(`SELECT word FROM words WHERE LENGTH(word) > 25 LIMIT 5`).all()) {
  console.log("  ", r.word.slice(0, 60) + (r.word.length > 60 ? "..." : ""));
}
