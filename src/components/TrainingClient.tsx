"use client";

import { useState } from "react";
import Link from "next/link";
import { ListeningPlayer } from "@/components/ListeningPlayer";
import { WordPopover } from "@/components/WordPopover";
import { formatDuration, levelLabel, type Material } from "@/lib/listening";

export function TrainingClient({ material }: { material: Material }) {
  const [activeWord, setActiveWord] = useState<string | null>(null);

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 bg-background">
      <div className="max-w-3xl mx-auto">
        <header className="mb-5">
          <Link
            href="/listening"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← 全部素材
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
            {material.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {material.source} · {levelLabel(material.level)}
            {material.cefr ? ` · ${material.cefr}` : ""} ·{" "}
            {formatDuration(material.durationSec)}
          </p>
          {material.difficultyReason && (
            <p className="mt-1 text-xs text-muted/60">
              {material.difficultyReason}
            </p>
          )}
        </header>

        <ListeningPlayer
          material={material}
          onWordClick={(w) => setActiveWord(w)}
        />

        <WordPopover word={activeWord} onClose={() => setActiveWord(null)} />
      </div>
    </div>
  );
}
