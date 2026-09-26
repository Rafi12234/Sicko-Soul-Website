"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { EASE } from "@/styles/theme";

type RecordShellProps = {
  index: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function RecordShell({ index, eyebrow, title, subtitle, children }: RecordShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".record-eyebrow", { y: 18, autoAlpha: 0, duration: 0.55 })
        .from(".record-title", { yPercent: 110, autoAlpha: 0, duration: 0.9 }, "-=0.25")
        .from(".record-subtitle", { y: 18, autoAlpha: 0, duration: 0.55 }, "-=0.4")
        .from(".record-body", { y: 30, autoAlpha: 0, duration: 0.8 }, "-=0.3");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scan = gsap.fromTo(
          ".record-scan",
          { yPercent: -100 },
          { yPercent: 2600, duration: 9, repeat: -1, ease: "none" },
        );
        return () => scan.kill();
      });
    }, root);

    return () => ctx.revert();
  }, [title]);

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black px-gutter pb-24 pt-32 text-bone-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(242,240,235,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(242,240,235,.045) 1px, transparent 1px)",
          backgroundSize: "clamp(60px,7vw,110px) clamp(60px,7vw,110px)",
        }}
      />
      <div aria-hidden className="record-scan pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-blood-accent/80 shadow-[0_0_40px_rgba(138,3,3,.65)]" />
      <span aria-hidden className="pointer-events-none absolute right-[-2vw] top-[14vh] font-display text-[clamp(13rem,34vw,40rem)] leading-[0.65] text-outline-2 opacity-[0.08]">
        {index}
      </span>

      <header className="relative z-10 mx-auto max-w-[1500px] border-b border-bone-white/15 pb-10">
        <div className="record-eyebrow flex items-center gap-4">
          <span className="h-px w-12 bg-blood-accent" />
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blood-accent">{eyebrow}</span>
        </div>
        <div className="split-mask mt-8">
          <h1 className="record-title max-w-[10ch] font-display text-[clamp(4rem,10vw,10rem)] leading-[0.78] tracking-crushed">{title}</h1>
        </div>
        {subtitle && (
          <p className="record-subtitle mt-7 max-w-[50ch] font-body text-[clamp(1.05rem,1.5vw,1.35rem)] leading-[1.5] text-bone-white/60">
            {subtitle}
          </p>
        )}
      </header>

      <main className="record-body relative z-10 mx-auto mt-12 max-w-[1500px]">{children}</main>
    </div>
  );
}
