"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE, STAGGER } from "@/styles/theme";
import { LOOKBOOK_COPY, LOOKBOOK_FRAMES } from "@/data/lookbook";
import styles from "./Lookbook.module.css";

const FRAME_COUNT = LOOKBOOK_FRAMES.length;
const ROTATION_MS = 4600;

/** Shortest signed offset, so the ends of the carousel join without a jump. */
function circularOffset(index: number, active: number) {
  const forward = (index - active + FRAME_COUNT) % FRAME_COUNT;
  return forward > FRAME_COUNT / 2 ? forward - FRAME_COUNT : forward;
}

/**
 * SICKO SOUL / 3D surveillance archive.
 * Cards occupy real cover-flow positions in perspective, rather than a moving
 * flat strip. Only the five nearest cards are visible and interactive.
 */
export default function Lookbook() {
  const rootRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const section = rootRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      const split = new SplitText(".lookbook-heading", { type: "chars" });
      const reveal = gsap.timeline({
        scrollTrigger: {
          id: "lookbook-intro",
          trigger: section,
          start: "top 85%",
          toggleActions: "play none none none",
          once: true,
        },
      });
      reveal
        .from(split.chars, {
          autoAlpha: 0,
          yPercent: 110,
          rotate: 5,
          duration: 0.85,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(".lookbook-script", {
          autoAlpha: 0,
          rotate: -12,
          scale: 0.85,
          duration: 0.75,
          ease: EASE.overshoot,
        }, "-=0.55")
        .from(".lookbook-meta", {
          autoAlpha: 0,
          y: 18,
          stagger: 0.06,
          duration: 0.55,
          ease: EASE.hard,
        }, "-=0.5");
      return () => split.revert();
    }, section);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const section = rootRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "100px 0px 100px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const isStopped = manuallyPaused || hovered || focusWithin || flippedIndex !== null || !visible || reducedMotion;

  useEffect(() => {
    if (isStopped) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % FRAME_COUNT);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, isStopped]);

  function navigate(direction: number) {
    setFlippedIndex(null);
    setActiveIndex((current) => (current + direction + FRAME_COUNT) % FRAME_COUNT);
  }

  function selectFrame(index: number) {
    if (touchSwiped.current) {
      touchSwiped.current = false;
      return;
    }
    if (index !== activeIndex) {
      setActiveIndex(index);
      setFlippedIndex(index);
    } else {
      setFlippedIndex((current) => current === index ? null : index);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigate(1);
    } else if (event.key === "Escape" && flippedIndex !== null) {
      event.preventDefault();
      setFlippedIndex(null);
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = delta - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) > 48) {
      touchSwiped.current = true;
      window.setTimeout(() => { touchSwiped.current = false; }, 450);
      navigate(distance < 0 ? 1 : -1);
    }
  }

  const activeFrame = LOOKBOOK_FRAMES[activeIndex]!;

  return (
    <section ref={rootRef} id="lookbook" className={`${styles.section} relative bg-black`}>
      <div className={styles.masthead}>
        <div className="lookbook-meta flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <p className="font-stencil text-stamp text-concrete-gray">{LOOKBOOK_COPY.eyebrow}</p>
          <p className="font-stencil text-stamp text-concrete-gray">{LOOKBOOK_COPY.aside}</p>
        </div>
        <div className={styles.rule} />
        <div className={styles.titleRow}>
          <div className="relative inline-block">
            <span className="split-mask block pb-[0.08em]">
              <span className="lookbook-heading text-distress block font-display text-display-xl leading-[0.85] text-bone-white">
                {LOOKBOOK_COPY.heading}
              </span>
            </span>
            <span className={`${styles.script} lookbook-script font-script text-blood-accent`} aria-hidden>
              {LOOKBOOK_COPY.headingScript}
            </span>
          </div>
          <div className={styles.controls}>
            <span className={styles.feedStatus}>
              <span className={styles.signal} aria-hidden />
              {flippedIndex !== null ? "CLASSIFIED / OPEN" : isStopped ? "SIGNAL PAUSED" : "SIGNAL / LIVE"}
            </span>
            <button
              type="button"
              className={styles.pauseButton}
              onClick={() => setManuallyPaused((current) => !current)}
              aria-label={manuallyPaused ? "Resume automatic carousel rotation" : "Pause automatic carousel rotation"}
              aria-pressed={manuallyPaused}
              data-cursor="hover"
            >
              {manuallyPaused ? "▶ RESUME" : "Ⅱ HOLD FEED"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={styles.gallery}
        role="region"
        aria-roledescription="3D carousel"
        aria-label="Caught on Camera: floating photographic archive. Click any photograph to flip it and reveal a message."
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={(event) => {
          // Pointer interaction is governed by hover/flip; keyboard focus must pause too.
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) setFocusWithin(true);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
        }}
        onKeyDown={onKeyDown}
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; touchSwiped.current = false; }}
        onTouchEnd={onTouchEnd}
      >
        <div className={styles.stage}>
          <div className={styles.glow} aria-hidden />
          <div className={styles.ghostType} aria-hidden>SICKO</div>
          <div className={styles.stageTop} aria-hidden>
            <span>SS / PRIVATE ARCHIVE</span>
            <span>001 — {String(FRAME_COUNT).padStart(3, "0")}</span>
          </div>

          {LOOKBOOK_FRAMES.map((frame, index) => {
            const offset = circularOffset(index, activeIndex);
            const distance = Math.abs(offset);
            const side = Math.sign(offset);
            const inView = distance <= 2;
            const shift = distance === 0 ? 0 : distance === 1 ? 76 : 146;
            const rotation = distance === 0 ? 0 : distance === 1 ? 37 : 57;
            const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;
            const depth = distance === 0 ? 110 : distance === 1 ? -70 : -250;
            const opacity = !inView ? 0 : distance === 0 ? 1 : distance === 1 ? 0.88 : 0.57;
            const cardStyle: CSSProperties = {
              transform: `translate(-50%, -50%) translate3d(${side * shift}%, 0, ${depth}px) rotateY(${-side * rotation}deg) scale(${scale})`,
              opacity,
              zIndex: distance === 0 ? 10 : distance === 1 ? 7 : 4,
              pointerEvents: inView ? "auto" : "none",
            };
            const isFlipped = flippedIndex === index;
            return (
              <article
                key={frame.id}
                className={`${styles.card} ${distance === 0 ? styles.centerCard : ""} ${isFlipped ? styles.flipped : ""}`}
                style={cardStyle}
                data-distance={distance}
                data-active={distance === 0}
                aria-hidden={!inView}
              >
                <button
                  type="button"
                  className={styles.flipButton}
                  onClick={() => selectFrame(index)}
                  aria-label={`${frame.title}. ${isFlipped ? "Close the message" : "Flip to reveal the message"}. Frame ${index + 1} of ${FRAME_COUNT}.`}
                  aria-pressed={isFlipped}
                  tabIndex={inView ? 0 : -1}
                  data-cursor="hover"
                >
                  <span className={styles.cardInner}>
                    <span className={styles.faceFront}>
                      <span className={styles.photoWrap}>
                        <Image
                          src={frame.src}
                          alt={frame.alt}
                          fill
                          sizes="(max-width: 620px) 72vw, (max-width: 1150px) 34vw, 390px"
                          className={styles.photo}
                          priority={index === 0}
                        />
                      </span>
                      <span className={styles.glassTint} aria-hidden />
                      <span className={styles.faceTop}>
                        <span>SS.0{index + 1} / SURVEILLANCE</span>
                        <span className={styles.recording}>● REC</span>
                      </span>
                      <span className={styles.faceBottom}>
                        <span className={styles.cardSpec}>{frame.spec}</span>
                        <strong className={styles.cardName}>{frame.title}</strong>
                        <span className={styles.cardCaption}>{frame.line}</span>
                      </span>
                      <span className={styles.flipPrompt} aria-hidden>OPEN FILE ↗</span>
                    </span>
                    <span className={styles.faceBack}>
                      <span className={styles.backCorners} aria-hidden />
                      <span className={styles.backTop}>FILE {frame.index} / CONFIDENTIAL</span>
                      <span className={styles.backInsignia} aria-hidden>✳</span>
                      <span className={styles.backLabel}>ONE MESSAGE. NO EXPLANATION.</span>
                      <strong className={styles.backMessage}>{frame.reveal}</strong>
                      <span className={styles.backAccent} aria-hidden />
                      <span className={styles.backBottom}>SS / LEAVE NO TRACE</span>
                      <span className={styles.backReturn}>TAP AGAIN TO RETURN ↵</span>
                    </span>
                  </span>
                </button>
                <span className={styles.cardEdge} aria-hidden />
              </article>
            );
          })}

          <div className={styles.stageBottom} aria-hidden>
            <span>FOCUS / {String(activeIndex + 1).padStart(2, "0")}</span>
            <span>DRAG THE EVIDENCE / NEVER THE PAGE</span>
          </div>
        </div>

        <div className={styles.dock}>
          <button type="button" className={styles.navButton} onClick={() => navigate(-1)} aria-label="Previous photograph" data-cursor="hover">
            <span aria-hidden>←</span>
          </button>
          <span className={styles.dockThumb} aria-hidden>
            <Image src={activeFrame.src} alt="" fill sizes="52px" className={styles.dockPhoto} />
          </span>
          <div className={styles.dockInfo}>
            <span>NOW VIEWING / {String(activeIndex + 1).padStart(2, "0")}</span>
            <strong>{activeFrame.title}</strong>
          </div>
          <span className={styles.dockDivider} aria-hidden />
          <button type="button" className={styles.navButton} onClick={() => navigate(1)} aria-label="Next photograph" data-cursor="hover">
            <span aria-hidden>→</span>
          </button>
        </div>
        <div className={styles.dots} aria-label="Choose a photograph">
          {LOOKBOOK_FRAMES.map((frame, index) => (
            <button
              type="button"
              key={frame.id}
              className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ""}`}
              aria-label={`Show frame ${index + 1}: ${frame.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => { setFlippedIndex(null); setActiveIndex(index); }}
              data-cursor="hover"
            />
          ))}
        </div>
        <p className={styles.galleryInstruction}>
          <span>HOVER TO FREEZE THE SCENE</span>
          <span>CLICK A FRAME / UNSEAL THE MESSAGE</span>
          <span>SWIPE OR USE THE ARROWS</span>
        </p>
      </div>

      <div className={styles.signoff}>
        <span>{LOOKBOOK_COPY.outro}</span>
        <span>{LOOKBOOK_COPY.outroMeta}</span>
      </div>
    </section>
  );
}
