"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import type { WordEntry, WordExchange } from "@/lib/dict";
import { normalizeDefinition, normalizeNewlines } from "@/lib/pos";
import { SpeakButton } from "./SpeakButton";

const TAG_LABELS: Record<string, string> = {
  zk: "中考",
  gk: "高考",
  cet4: "四级",
  cet6: "六级",
  ky: "考研",
  toefl: "托福",
  ielts: "雅思",
  gre: "GRE",
};

function formatExchange(ex: WordExchange): string {
  const parts: string[] = [];
  if (ex.past) parts.push(`过去式 ${ex.past}`);
  if (ex.pastParticiple) parts.push(`过去分词 ${ex.pastParticiple}`);
  if (ex.presentParticiple) parts.push(`现在分词 ${ex.presentParticiple}`);
  if (ex.thirdPerson) parts.push(`三单 ${ex.thirdPerson}`);
  if (ex.plural) parts.push(`复数 ${ex.plural}`);
  if (ex.comparative) parts.push(`比较级 ${ex.comparative}`);
  if (ex.superlative) parts.push(`最高级 ${ex.superlative}`);
  if (ex.lemma) parts.push(`原形 ${ex.lemma}`);
  return parts.join(" · ");
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "amber" | "rose" | "sky";
}) {
  const colorMap = {
    amber:
      "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200",
    rose: "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200",
    sky: "bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200",
  };
  return (
    <span
      className={`text-[10px] leading-none px-1.5 py-1 rounded ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 leading-relaxed">
      <span className="shrink-0 w-9 text-xs text-muted/60 pt-0.5 select-none">
        {label}
      </span>
      <span className="flex-1 min-w-0">{children}</span>
    </div>
  );
}

type SpellState =
  | { mode: "idle" }
  | { mode: "input" }
  | { mode: "correct"; userInput: string }
  | { mode: "wrong"; userInput: string };

export function WordCard({
  entry,
  spellable = false,
  onMarkCorrect,
  onMarkWrong,
  headerExtra,
  footer,
}: {
  entry: WordEntry;
  spellable?: boolean;
  onMarkCorrect?: () => void;
  onMarkWrong?: () => void;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [spell, setSpell] = useState<SpellState>({ mode: "idle" });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const exchangeText = formatExchange(entry.exchange);
  const definition = normalizeDefinition(entry.definition);
  const examples = entry.examples ?? [];
  const hasTags =
    entry.tag.length > 0 || entry.collins > 0 || entry.oxford > 0;
  const isHidden = spell.mode === "input";

  useEffect(() => {
    if (spell.mode === "input") inputRef.current?.focus();
  }, [spell.mode]);

  function startSpell() {
    setInput("");
    setSpell({ mode: "input" });
  }

  function cancelSpell() {
    setInput("");
    setSpell({ mode: "idle" });
  }

  function handleSpellSubmit(e: FormEvent) {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput) return;
    if (userInput.toLowerCase() === entry.word.toLowerCase()) {
      setSpell({ mode: "correct", userInput });
      onMarkCorrect?.();
    } else {
      setSpell({ mode: "wrong", userInput });
      onMarkWrong?.();
    }
  }

  function tryAgain() {
    setInput("");
    setSpell({ mode: "input" });
  }

  return (
    <article className="space-y-1.5">
      <header className="flex items-center gap-2 flex-wrap">
        {isHidden ? (
          <h2 className="text-xl font-semibold tracking-tight text-muted/40 select-none font-mono">
            {"•".repeat(Math.min(entry.word.length, 12))}
          </h2>
        ) : (
          <h2
            className={`text-xl font-semibold tracking-tight ${
              spell.mode === "correct"
                ? "text-emerald-700 dark:text-emerald-400"
                : spell.mode === "wrong"
                ? "text-rose-700 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {entry.word}
          </h2>
        )}

        <SpeakButton word={entry.word} accent="us" size="sm" />
        <SpeakButton word={entry.word} accent="uk" size="sm" />

        {!isHidden && entry.phonetic && (
          <span className="text-sm text-muted font-mono">
            /{entry.phonetic}/
          </span>
        )}

        {!isHidden && hasTags && (
          <div className="flex flex-wrap gap-1 items-center">
            {entry.tag.map((t) => (
              <Tag key={t} color="amber">
                {TAG_LABELS[t] || t}
              </Tag>
            ))}
            {entry.collins > 0 && (
              <Tag color="rose">柯林斯 {"★".repeat(entry.collins)}</Tag>
            )}
            {entry.oxford > 0 && <Tag color="sky">牛津</Tag>}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {spellable && spell.mode === "idle" && (
            <button
              type="button"
              onClick={startSpell}
              title="盲拼这个词"
              className="text-xs px-2 py-1 rounded-md bg-accent-light hover:opacity-80 text-foreground leading-none transition-opacity"
            >
              盲拼
            </button>
          )}
          {spellable && spell.mode !== "idle" && (
            <button
              type="button"
              onClick={cancelSpell}
              className="text-xs px-2 py-1 rounded-md text-muted hover:text-foreground leading-none"
            >
              取消
            </button>
          )}
          {headerExtra}
        </div>
      </header>

      {spell.mode === "input" && (
        <form
          onSubmit={handleSpellSubmit}
          className="flex gap-2 ml-12 my-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="拼出这个词，回车提交"
            className="flex-1 px-3 py-2 rounded-lg border border-card-border bg-card-bg text-base font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            对答案
          </button>
        </form>
      )}

      {spell.mode === "wrong" && (
        <div className="ml-12 text-sm text-rose-700 dark:text-rose-400">
          ✗ 你写的：
          <span className="font-mono ml-1 line-through">
            {spell.userInput}
          </span>
          <button
            type="button"
            onClick={tryAgain}
            className="ml-3 text-xs px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300"
          >
            再来一次
          </button>
        </div>
      )}

      {spell.mode === "correct" && (
        <div className="ml-12 text-sm text-emerald-700 dark:text-emerald-400">
          ✓ 正确！
        </div>
      )}

      <div className="text-sm space-y-1">
        {entry.translation && (
          <Row label="中">
            <span className="whitespace-pre-line text-foreground">
              {entry.translation}
            </span>
          </Row>
        )}
        {!isHidden && definition && (
          <Row label="英">
            <span className="whitespace-pre-line text-muted">
              {definition}
            </span>
          </Row>
        )}
        {!isHidden && exchangeText && (
          <Row label="词形">
            <span className="text-foreground">
              {exchangeText}
            </span>
          </Row>
        )}
        {!isHidden && examples.length > 0 && (
          <Row label="例">
            <ul className="space-y-0.5 text-foreground">
              {examples.map((ex, i) => (
                <li
                  key={i}
                  className="leading-relaxed before:content-['—_'] before:text-muted/40"
                >
                  {ex}
                </li>
              ))}
            </ul>
          </Row>
        )}
      </div>

      {footer && (
        <div className="text-[11px] text-muted/60 pl-12 pt-0.5">
          {footer}
        </div>
      )}
    </article>
  );
}
