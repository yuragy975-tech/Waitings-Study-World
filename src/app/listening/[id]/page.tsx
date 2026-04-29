"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListeningPlayer } from "@/components/ListeningPlayer";
import { WordPopover } from "@/components/WordPopover";
import { findMaterial, levelLabel, formatDuration } from "@/lib/listening";

export default function ListeningTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const material = findMaterial(id);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  if (!material) notFound();

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto">
        <header className="mb-5">
          <Link
            href="/listening"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← 全部素材
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {material.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {material.source} · {levelLabel(material.level)} ·{" "}
            {formatDuration(material.durationSec)}
          </p>
        </header>

        <ListeningPlayer
          material={material}
          onWordClick={(w) => setActiveWord(w)}
        />

        <WordPopover
          word={activeWord}
          onClose={() => setActiveWord(null)}
        />
      </div>
    </div>
  );
}
