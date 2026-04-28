"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { WordEntry } from "@/lib/dict";

// 笔记本里每一条记录的结构
export interface NotebookEntry {
  word: string;                  // 单词原文
  entry: WordEntry;              // 加入时的字典快照
  addedAt: number;               // 加入时间戳（ms）
  reviewedCount: number;         // 答对次数（盲拼 / 听写答对 / 手动 +1）
  wrongCount: number;            // 答错次数
  lastReviewedAt: number | null; // 上次复习时间戳
}

const STORAGE_KEY = "shengci-baodian:notebook:v1";
const EMPTY: NotebookEntry[] = [];

const listeners = new Set<() => void>();
let cache: NotebookEntry[] | null = null;

// 老版本数据可能没有 wrongCount / examples，这里统一补默认值，避免运行时崩
function normalizeEntry(e: Partial<NotebookEntry>): NotebookEntry {
  const dictEntry = (e.entry ?? {}) as WordEntry;
  return {
    word: e.word ?? "",
    entry: { ...dictEntry, examples: dictEntry.examples ?? [] },
    addedAt: e.addedAt ?? Date.now(),
    reviewedCount: e.reviewedCount ?? 0,
    wrongCount: e.wrongCount ?? 0,
    lastReviewedAt: e.lastReviewedAt ?? null,
  };
}

function readFromStorage(): NotebookEntry[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return (parsed as Partial<NotebookEntry>[]).map(normalizeEntry);
  } catch {
    return EMPTY;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function getSnapshot(): NotebookEntry[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

// SSR 时返回稳定的空数组引用，避免水合错误
function getServerSnapshot(): NotebookEntry[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // 跨标签页同步：另一个标签改了 localStorage，本标签也跟着刷新
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

function mutate(updater: (prev: NotebookEntry[]) => NotebookEntry[]) {
  const next = updater(getSnapshot());
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 配额超了或 storage 被禁，静默失败
  }
  notify();
}

// 标记当前是否在客户端（区分 SSR 空状态 vs 真的空笔记本）
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function useNotebook() {
  const entries = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const hydrated = useIsClient();

  const addWord = useCallback((entry: WordEntry) => {
    const key = entry.word.toLowerCase();
    mutate((prev) => {
      const idx = prev.findIndex((e) => e.word.toLowerCase() === key);
      if (idx >= 0) {
        // 已存在：保留计数，但更新字典快照（拿到最新的例句等）+ 移到最前
        const existing = prev[idx];
        const updated: NotebookEntry = { ...existing, entry };
        return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      const fresh: NotebookEntry = {
        word: entry.word,
        entry,
        addedAt: Date.now(),
        reviewedCount: 0,
        wrongCount: 0,
        lastReviewedAt: null,
      };
      return [fresh, ...prev];
    });
  }, []);

  const incrementReview = useCallback((word: string) => {
    const key = word.toLowerCase();
    mutate((prev) =>
      prev.map((e) =>
        e.word.toLowerCase() === key
          ? {
              ...e,
              reviewedCount: e.reviewedCount + 1,
              lastReviewedAt: Date.now(),
            }
          : e
      )
    );
  }, []);

  const incrementWrong = useCallback((word: string) => {
    const key = word.toLowerCase();
    mutate((prev) =>
      prev.map((e) =>
        e.word.toLowerCase() === key
          ? {
              ...e,
              wrongCount: e.wrongCount + 1,
              lastReviewedAt: Date.now(),
            }
          : e
      )
    );
  }, []);

  const removeWord = useCallback((word: string) => {
    const key = word.toLowerCase();
    mutate((prev) => prev.filter((e) => e.word.toLowerCase() !== key));
  }, []);

  const clear = useCallback(() => {
    mutate(() => []);
  }, []);

  return {
    entries,
    hydrated,
    addWord,
    incrementReview,
    incrementWrong,
    removeWord,
    clear,
  };
}
