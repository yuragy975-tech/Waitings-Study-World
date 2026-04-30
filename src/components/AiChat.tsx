"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AiChatProps = {
  mode: "grammar" | "general";
  topicId?: string;
  topicLabel: string;
  topic?: string;
  documentContent?: string;
  onBack: () => void;
};

export function AiChat({
  mode,
  topicId,
  topicLabel,
  topic,
  documentContent,
  onBack,
}: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const sendMessages = useCallback(
    async (allMessages: Message[]) => {
      setStreaming(true);
      setError("");

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            mode,
            topicId,
            topic,
            documentContent,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              if (json.content) {
                assistantContent += json.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              if (json.error) {
                setError(json.error);
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [mode, topicId, topic, documentContent],
  );

  useEffect(() => {
    const greeting: Message = {
      role: "user",
      content:
        mode === "grammar"
          ? `我想学习「${topicLabel}」这个语法知识点，请开始教我吧！`
          : `我想学习「${topicLabel}」，请开始教我吧！`,
    };
    const initial = [greeting];
    setMessages(initial);
    sendMessages(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    sendMessages(updated);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-card-border">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← 返回
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-foreground truncate">
            {topicLabel}
          </h2>
          <p className="text-xs text-muted">
            费曼学习法 · AI交互式学习
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => {
          if (i === 0 && msg.role === "user") return null;
          return (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-accent-fg"
                    : "bg-accent-light text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownLite text={msg.content} />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
                {streaming &&
                  msg.role === "assistant" &&
                  i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full ml-0.5 animate-pulse align-middle" />
                  )}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="text-center text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-card-border px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            placeholder={streaming ? "小典正在思考..." : "输入你的回答..."}
            disabled={streaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
        <p className="mt-2 text-xs text-muted/60 text-center">
          Shift+Enter 换行 · Enter 发送
        </p>
      </div>
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="font-semibold text-base mt-3 mb-1 text-foreground"
        >
          {inlineFormat(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="font-bold text-base mt-3 mb-1 text-foreground"
        >
          {inlineFormat(line.slice(3))}
        </h2>,
      );
    } else if (/^[-*] /.test(line)) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1">
          <span className="text-muted shrink-0">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="my-0.5">
          {inlineFormat(line)}
        </p>,
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[4]) {
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 bg-accent-light rounded text-xs font-mono"
        >
          {match[4]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
