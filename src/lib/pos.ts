// 把 ECDICT 英文释义行首的 WordNet POS 代号 (n/v/a/s/r) 规范成中文学习者熟悉的写法
// - n  → n.        （名词 noun）
// - v  → v.        （动词 verb）
// - a  → adj.      （形容词 adjective）
// - s  → adj.      （satellite adjective，本质就是形容词）
// - r  → adv.      （副词 adverb）
//
// 规范化在两处调用：
//  1) dict.ts 的 lookupWord：新查的词存入笔记本前就是规范的
//  2) WordCard 的渲染：兜底处理用户笔记本里旧版未规范的缓存数据
const POS_NORMALIZE: Record<string, string> = {
  n: "n.",
  v: "v.",
  a: "adj.",
  s: "adj.",
  r: "adv.",
};

// ECDICT 的 CSV 把多个义项用字面量 "\n"（两个字符：反斜杠 + 字母 n）分隔，
// 这里把它转成真正的换行符，让 CSS whitespace-pre-line 能正确换行展示
export function normalizeNewlines(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/\\n/g, "\n");
}

export function normalizeDefinition(def: string | null): string | null {
  if (!def) return def;
  const text = normalizeNewlines(def);
  if (!text) return text;
  return text
    .split("\n")
    .map((line) =>
      line.replace(
        /^([nvasr])\.?\s+/,
        (_, code: string) => `${POS_NORMALIZE[code] ?? code + "."} `
      )
    )
    .join("\n");
}

