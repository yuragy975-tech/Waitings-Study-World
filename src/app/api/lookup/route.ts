import { NextRequest, NextResponse } from "next/server";
import { lookupWord } from "@/lib/dict";

// 这条路由必须跑在 Node.js 运行时（不是 Edge），因为 better-sqlite3 是原生模块
export const runtime = "nodejs";

// 单词词典是只读的、变化频率极低，缓存 1 天
export const revalidate = 86400;

// Free Dictionary API 返回结构（只列我们用得到的部分）
interface FreeDictDefinition {
  example?: string;
}
interface FreeDictMeaning {
  definitions?: FreeDictDefinition[];
}
interface FreeDictEntry {
  meanings?: FreeDictMeaning[];
}

async function fetchExamples(word: string): Promise<string[]> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      // 同样的词反复查时让 fetch 缓存命中
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];

    const examples: string[] = [];
    for (const entry of data as FreeDictEntry[]) {
      for (const m of entry.meanings ?? []) {
        for (const d of m.definitions ?? []) {
          if (typeof d.example === "string" && d.example.trim()) {
            examples.push(d.example.trim());
          }
        }
      }
    }
    // 去重 + 限制到 4 句（够看不过载）
    return Array.from(new Set(examples)).slice(0, 4);
  } catch {
    // 超时 / 网络错误 / 解析错误：静默返回空数组，不影响主流程
    return [];
  }
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word")?.trim();

  if (!word) {
    return NextResponse.json(
      { error: "missing 'word' query parameter" },
      { status: 400 }
    );
  }

  if (word.length > 50) {
    return NextResponse.json({ error: "word too long" }, { status: 400 });
  }

  const entry = lookupWord(word);
  if (!entry) {
    return NextResponse.json(
      { found: false, word, message: "未在词典中找到该单词" },
      { status: 404 }
    );
  }

  // 用真实单词形式（保留大小写）去 Free Dictionary API 拉例句
  const examples = await fetchExamples(entry.word);

  return NextResponse.json({
    found: true,
    entry: { ...entry, examples },
  });
}
