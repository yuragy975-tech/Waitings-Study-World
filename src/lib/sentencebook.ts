"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface GrammarNote {
  point: string;       // 语法点名（如"现在完成时"）
  explanation: string; // 通俗解释
}

export interface SentenceEntry {
  id: string;
  original: string;
  paraphrase: string | null;    // DeepSeek 同义改写
  translation: string | null;   // 中文释义
  grammar: GrammarNote[];       // 语法点（可为空数组）
  source: {                     // 句子从哪里来
    materialId?: string;
    materialTitle?: string;
    segmentIndex?: number;
  };
  addedAt: number;
}

const STORAGE_KEY = "shengci-baodian:sentences:v1";
const EMPTY: SentenceEntry[] = [];

const listeners = new Set<() => void>();
let cache: SentenceEntry[] | null = null;

function normalize(e: Partial<SentenceEntry>): SentenceEntry {
  return {
    id: e.id ?? `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    original: e.original ?? "",
    paraphrase: e.paraphrase ?? null,
    translation: e.translation ?? null,
    grammar: Array.isArray(e.grammar) ? e.grammar : [],
    source: e.source ?? {},
    addedAt: e.addedAt ?? Date.now(),
  };
}

function readFromStorage(): SentenceEntry[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return (parsed as Partial<SentenceEntry>[]).map(normalize);
  } catch {
    return EMPTY;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function getSnapshot(): SentenceEntry[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function getServerSnapshot(): SentenceEntry[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = readFromStorage();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function mutate(updater: (prev: SentenceEntry[]) => SentenceEntry[]) {
  const next = updater(getSnapshot());
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 配额超了，静默失败
  }
  notify();
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useSentenceBook() {
  const entries = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const hydrated = useIsClient();

  const addSentence = useCallback(
    (entry: Omit<SentenceEntry, "id" | "addedAt">) => {
      const fresh = normalize(entry);
      mutate((prev) => {
        // 同一篇 + 同一句不重复加
        const dup = prev.find(
          (e) =>
            e.original.trim().toLowerCase() ===
            fresh.original.trim().toLowerCase(),
        );
        if (dup) {
          // 已存在 → 更新（补充 paraphrase / translation / grammar）
          return prev.map((e) =>
            e.id === dup.id
              ? {
                  ...e,
                  paraphrase: fresh.paraphrase ?? e.paraphrase,
                  translation: fresh.translation ?? e.translation,
                  grammar:
                    fresh.grammar.length > 0 ? fresh.grammar : e.grammar,
                }
              : e,
          );
        }
        return [fresh, ...prev];
      });
      return fresh.id;
    },
    [],
  );

  const removeSentence = useCallback((id: string) => {
    mutate((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    mutate(() => []);
  }, []);

  return { entries, hydrated, addSentence, removeSentence, clear };
}
