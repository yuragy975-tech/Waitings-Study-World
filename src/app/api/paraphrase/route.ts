import { NextResponse } from "next/server";

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4-flash"; // 智谱永久免费模型

const SYSTEM_PROMPT = `你是一位资深英语语言学家与雅思教师。用户给你一句英文，你需要返回严格的 JSON，包含四部分：
1. paraphrase: 一句语法完全正确、表达地道的同义替换英文（替换尽量多的词，但保持原意）
2. translation: 原句的简明中文翻译
3. grammar: 数组，列出原句里**最多 3 个**重要语法点；每个对象 { "point": "语法点名", "explanation": "用中文一两句通俗解释" }；如果句子很简单没什么可讲，返回空数组 []
4. 严格只返回 JSON，不要任何前后说明文字、不要 markdown code fence`;

type ChatResp = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export async function POST(request: Request) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ZHIPU_API_KEY_MISSING",
        message:
          "服务器没配置智谱 API Key。请在项目根目录新建 .env.local 文件，写入 ZHIPU_API_KEY=你的key 并重启 dev 服务器。",
      },
      { status: 503 },
    );
  }

  let body: { sentence?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const sentence = (body.sentence ?? "").trim();
  if (!sentence || sentence.length > 500) {
    return NextResponse.json(
      { error: "INVALID_SENTENCE", message: "句子为空或超过 500 字符" },
      { status: 400 },
    );
  }

  try {
    const r = await fetch(ZHIPU_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: sentence },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return NextResponse.json(
        {
          error: "ZHIPU_HTTP_ERROR",
          status: r.status,
          message: txt.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await r.json()) as ChatResp;
    let content = data.choices?.[0]?.message?.content ?? "";
    // 智谱有时会包一层 ```json ... ```，剥掉
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: {
      paraphrase?: string;
      translation?: string;
      grammar?: { point?: string; explanation?: string }[];
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "ZHIPU_BAD_JSON", raw: content.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      paraphrase: parsed.paraphrase ?? "",
      translation: parsed.translation ?? "",
      grammar: (parsed.grammar ?? [])
        .filter((g) => g && g.point && g.explanation)
        .slice(0, 3)
        .map((g) => ({ point: g.point!, explanation: g.explanation! })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
