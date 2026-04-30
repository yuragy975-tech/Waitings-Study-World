// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

const MAX_CHARS = 80_000;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const pastedText = formData.get("text") as string | null;

  if (pastedText) {
    const text = pastedText.trim().slice(0, MAX_CHARS);
    return Response.json({
      text,
      title: "粘贴的文本",
      charCount: text.length,
      truncated: pastedText.trim().length > MAX_CHARS,
    });
  }

  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "NO_FILE", message: "请上传一个文件或粘贴文本" },
      { status: 400 },
    );
  }

  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const raw = await file.text();
    const text = raw.trim().slice(0, MAX_CHARS);
    return Response.json({
      text,
      title: file.name.replace(/\.[^.]+$/, ""),
      charCount: text.length,
      truncated: raw.trim().length > MAX_CHARS,
    });
  }

  if (name.endsWith(".pdf")) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdf(buffer);
      const text = (result.text ?? "").trim().slice(0, MAX_CHARS);

      if (!text) {
        return Response.json(
          {
            error: "EMPTY_PDF",
            message:
              "PDF 内没有提取到文字，可能是扫描件（图片PDF）。请尝试粘贴文本。",
          },
          { status: 422 },
        );
      }

      return Response.json({
        text,
        title: file.name.replace(/\.pdf$/i, ""),
        charCount: text.length,
        truncated: (result.text ?? "").trim().length > MAX_CHARS,
      });
    } catch (err) {
      return Response.json(
        {
          error: "PDF_PARSE_ERROR",
          message:
            "PDF 解析失败：" +
            (err instanceof Error ? err.message : String(err)),
        },
        { status: 422 },
      );
    }
  }

  return Response.json(
    {
      error: "UNSUPPORTED_FORMAT",
      message: "只支持 PDF 和 TXT 文件。也可以直接粘贴文本。",
    },
    { status: 400 },
  );
}
