"use client";

import { useState } from "react";
import { GRAMMAR_TOPICS, type GrammarTopic } from "@/lib/grammar-data";
import { AiChat } from "@/components/AiChat";

export default function GrammarPage() {
  const [activeTopic, setActiveTopic] = useState<GrammarTopic | null>(null);

  if (activeTopic) {
    return (
      <AiChat
        mode="grammar"
        topicId={activeTopic.id}
        topicLabel={activeTopic.title}
        onBack={() => setActiveTopic(null)}
      />
    );
  }

  return (
    <div className="min-h-full bg-background px-4 sm:px-8 py-8 lg:py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">语法学习</h1>
          <p className="mt-1.5 text-sm text-muted">
            选择一个语法知识点，小典会用费曼学习法一步步带你掌握。
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {GRAMMAR_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setActiveTopic(topic)}
              className="flex items-start gap-3 rounded-2xl border border-card-border bg-card-bg p-5 text-left transition-all hover:shadow-md hover:border-accent/30 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <span className="text-2xl shrink-0 mt-0.5">{topic.icon}</span>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                  {topic.title}
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  {topic.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-card-border p-5">
          <h3 className="text-sm font-medium mb-2">
            什么是费曼学习法？
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            理查德·费曼是诺贝尔物理学奖得主，他认为最好的学习方法是"用最简单的话把知识教给别人"。如果你没办法用简单的语言解释一个概念，说明你还没有真正理解它。小典会扮演一个好奇的学生不断追问你，帮你找到理解中的盲区。
          </p>
        </div>
      </div>
    </div>
  );
}
