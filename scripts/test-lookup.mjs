import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../data/ecdict.db"), { readonly: true });

const stmt = db.prepare(`SELECT * FROM words WHERE word = ? COLLATE NOCASE`);

const tests = ["hello", "abandon", "cogent", "epitome", "Hello", "doesnotexist", "ubiquitous"];

for (const word of tests) {
  const t0 = Date.now();
  const r = stmt.get(word);
  const ms = Date.now() - t0;
  console.log(`\n=== ${word}  (${ms}ms) ===`);
  if (!r) {
    console.log("  未找到");
    continue;
  }
  console.log(`  词:        ${r.word}`);
  console.log(`  音标:      ${r.phonetic ?? "-"}`);
  console.log(`  词性:      ${r.pos ?? "-"}`);
  console.log(`  英释:      ${(r.definition || "-").split("\n")[0].slice(0, 60)}`);
  console.log(`  中释:      ${(r.translation || "-").split("\n")[0].slice(0, 60)}`);
  console.log(`  考试标签:  ${r.tag ?? "-"}`);
  console.log(`  词形变化:  ${r.exchange ?? "-"}`);
  console.log(`  柯林斯★:   ${r.collins ?? 0}    频率(BNC/COCA): ${r.bnc}/${r.frq}`);
}
