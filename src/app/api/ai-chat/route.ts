import { GRAMMAR_CONTENT } from "@/lib/grammar-data";

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4-flash";

const GRAMMAR_SYSTEM = `你是一位精通费曼学习法的英语语法教练，名字叫"小典"。

## 教学方法（三个阶段）

### 阶段一：猎杀（核心20%）
用户选择一个语法主题后，你先用2-3句话概括这个知识点的核心要义。只抓最关键的20%，不要罗列所有细节。然后立刻进入提问。

### 阶段二：费曼深学
- 每次只问用户一个问题
- 要求用户用最简单的语言来回答（像给6岁小孩解释一样）
- 回答正确且清晰 → 肯定，然后问一个更深的问题
- 有误解 → 温和指出，给一个小提示，让他们再试
- 回答太复杂/太学术 → 要求用更简单的方式重新解释
- 如果用户说"不知道"或"不会" → 给引导性提示而不是直接给答案
- 用4-5个问题覆盖该知识点的关键方面

### 阶段三：输出（当你觉得用户已掌握核心概念时）
生成一张知识卡片（用 markdown 格式），包含：
📝 **一句话总结**
📖 **2-3个关键例句**（英文）
⚠️ **1-2个常见易错点**
🗣️ **教给别人的话术**（一段简短的解释，用户可以直接用来给别人讲）

## 规则
- 用中文交流，语法例句用英语
- 每次回复保持简短（3-5句话），不要长篇大论
- 每次只问一个问题，等用户回答后再继续
- 语气温和鼓励，像一位有耐心的朋友
- 第一条消息：先概括核心（阶段一），然后立刻提出第一个问题（进入阶段二）`;

const GENERAL_SYSTEM = `你是一位精通费曼学习法的AI学习教练，名字叫"小典"。

## 教学方法（三个阶段）

### 阶段一：猎杀（核心20%）
用户告诉你想学什么后，你先用2-3句话概括这个主题的核心要义——最重要的20%。然后立刻进入提问。

### 阶段二：费曼深学
- 每次只问用户一个问题
- 要求用户用最简单的语言来回答（像给6岁小孩解释一样）
- 回答正确且清晰 → 肯定，然后问一个更深的问题
- 有误解 → 温和指出，给一个小提示，让他们再试
- 回答太复杂/太学术 → 要求用更简单的方式重新解释
- 如果用户说"不知道"或"不会" → 给引导性提示而不是直接给答案
- 用4-5个问题覆盖该主题的关键方面

### 阶段三：输出（当你觉得用户已掌握核心概念时）
生成一张知识卡片（用 markdown 格式），包含：
📝 **一句话总结**
💡 **2-3个关键知识点**
⚠️ **1-2个常见误区**
🗣️ **教给别人的话术**（一段简短的解释，用户可以直接用来给别人讲）

## 规则
- 用中文交流
- 每次回复保持简短（3-5句话），不要长篇大论
- 每次只问一个问题，等用户回答后再继续
- 语气温和鼓励，像一位有耐心的朋友
- 如果涉及英语知识，例句用英语
- 第一条消息：先概括核心（阶段一），然后立刻提出第一个问题（进入阶段二）`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ZHIPU_API_KEY_MISSING" },
      { status: 503 },
    );
  }

  let body: {
    messages?: Message[];
    mode?: "grammar" | "general";
    topicId?: string;
    topic?: string;
    documentContent?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const mode = body.mode ?? "general";

  let systemPrompt: string;
  if (mode === "grammar" && body.topicId) {
    const content = GRAMMAR_CONTENT[body.topicId] ?? "";
    systemPrompt = GRAMMAR_SYSTEM + "\n\n## 参考教材内容\n" + content;
  } else if (mode === "general" && body.topic) {
    systemPrompt =
      GENERAL_SYSTEM + `\n\n用户选择的学习主题是：「${body.topic}」`;
  } else {
    systemPrompt = mode === "grammar" ? GRAMMAR_SYSTEM : GENERAL_SYSTEM;
  }

  if (body.documentContent) {
    systemPrompt +=
      "\n\n## 用户上传的学习资料（你必须严格基于以下内容来教学，不要编造资料中没有的信息）\n\n" +
      body.documentContent.slice(0, 80_000);
  }

  const zhipuRes = await fetch(ZHIPU_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!zhipuRes.ok || !zhipuRes.body) {
    const txt = await zhipuRes.text().catch(() => "");
    return Response.json(
      { error: "ZHIPU_ERROR", message: txt.slice(0, 500) },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = zhipuRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`,
          ),
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
