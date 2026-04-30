"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

type Phase = "playing" | "ready" | "recording" | "done";

export function ShadowingPanel({
  durationSec,
  onPlayOriginal,
  onClose,
}: {
  durationSec: number;
  onPlayOriginal: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("playing");
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const { audioUrl, analyserRef, start, stop, reset } = useAudioRecorder();

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | undefined>(undefined);

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearInterval(intervalRef.current);
    if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
  }

  function addTimer(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // center line
      ctx.beginPath();
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      // waveform
      ctx.beginPath();
      const sliceW = canvas.width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.stroke();
      animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
  }

  const doStart = useCallback(() => {
    clearAll();
    reset();
    setMicError(false);
    setElapsed(0);
    setPhase("playing");
    onPlayOriginal();

    const playMs = Math.max(1500, durationSec * 1000 + 800);
    addTimer(() => {
      setPhase("ready");
      addTimer(() => {
        setPhase("recording");
        setElapsed(0);
        start().then((ok) => {
          if (!ok) {
            setMicError(true);
            setPhase("done");
            return;
          }
          // slight delay to let analyser attach
          requestAnimationFrame(() => drawWaveform());

          intervalRef.current = setInterval(() => {
            setElapsed((e) => +(e + 0.1).toFixed(1));
          }, 100);

          const recMs = Math.max(2000, durationSec * 1000 + 500);
          addTimer(() => {
            stop();
            clearInterval(intervalRef.current);
            if (animFrameRef.current !== undefined) {
              cancelAnimationFrame(animFrameRef.current);
            }
            setPhase("done");
          }, recMs);
        });
      }, 1000);
    }, playMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec, onPlayOriginal]);

  // auto-start on mount
  useEffect(() => {
    doStart();
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualStop() {
    stop();
    clearAll();
    if (animFrameRef.current !== undefined) cancelAnimationFrame(animFrameRef.current);
    setPhase("done");
  }

  return (
    <div className="mt-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700 dark:text-red-300">
          🎤 镜像跟读
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1"
        >
          ✕
        </button>
      </div>

      {phase === "playing" && (
        <p className="text-xs text-red-600 dark:text-red-400 animate-pulse">
          ▶ 原声播放中，请先认真听...
        </p>
      )}

      {phase === "ready" && (
        <p className="text-sm font-bold text-red-600 dark:text-red-400 animate-pulse text-center py-1">
          准备跟读...
        </p>
      )}

      {phase === "recording" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-300 font-medium tabular-nums">
              录音中 {elapsed.toFixed(1)}s / {durationSec.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={handleManualStop}
              className="ml-auto text-xs px-2.5 py-1 rounded-md bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-800"
            >
              停止
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={48}
            className="w-full rounded-lg bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900"
          />
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-2">
          {micError ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ 无法访问麦克风，请检查浏览器权限。
            </p>
          ) : audioUrl ? (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">你的跟读：</p>
              <audio controls src={audioUrl} className="w-full" />
            </>
          ) : (
            <p className="text-xs text-zinc-400 animate-pulse">处理中...</p>
          )}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={doStart}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              🔄 重试
            </button>
            <button
              type="button"
              onClick={onPlayOriginal}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              🔊 再听原声
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
