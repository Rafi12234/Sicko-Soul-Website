"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import { gsap } from "@/lib/gsap";

const VERTEX = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/*
 * Displacement is pushed radially away from the pointer and smeared by scroll
 * velocity. The chromatic split is re-tinted to the brand accent instead of the
 * usual red/cyan so the glitch never introduces an off-palette colour.
 */
const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uHover;
  uniform float uVelocity;
  uniform float uReveal;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    float frameAspect = uResolution.x / uResolution.y;
    float imageAspect = uImageSize.x / uImageSize.y;
    vec2 ratio = vec2(
      min(frameAspect / imageAspect, 1.0),
      min(imageAspect / frameAspect, 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    float dist = distance(vUv, uPointer);
    float ring = smoothstep(0.6, 0.0, dist);
    float grain = noise(vUv * 8.0 + uTime * 0.4);
    float speed = abs(uVelocity);

    vec2 dir = normalize(vUv - uPointer + vec2(0.0001));
    float amp = (0.06 * uHover * ring) + speed * 0.045;
    uv += dir * amp * (0.45 + grain * 0.55);
    uv.x += uVelocity * 0.03 * (0.3 + grain * 0.7);

    float split = (0.014 * uHover * ring) + speed * 0.022;
    float left = luma(texture2D(uTexture, uv + vec2(split, 0.0)).rgb);
    float mid = luma(texture2D(uTexture, uv).rgb);
    float right = luma(texture2D(uTexture, uv - vec2(split, 0.0)).rgb);

    vec3 col = vec3(mid);
    float fringe = clamp(abs(left - right) * 1.8, 0.0, 1.0);
    col = mix(col, vec3(0.541, 0.012, 0.012), fringe * 0.6);

    // Mirrors .media-treat so shader frames grade like every other image.
    col = (col - 0.5) * 1.22 + 0.5;
    col *= 0.9;
    col -= (grain - 0.5) * 0.05;

    // Letterbox reveal, matching the CSS frames elsewhere on the page.
    float edge = abs(vUv.y - 0.5) * 2.0;
    float open = step(edge, uReveal);

    gl_FragColor = vec4(col * open, 1.0);
  }
`;

type Props = {
  src: string;
  alt: string;
  /** Shared scroll-velocity signal in roughly -1..1, written by the section. */
  velocityRef: React.MutableRefObject<number>;
  className?: string;
};

export default function DistortionImage({ src, alt, velocityRef, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Falls back to a plain treated image on mobile, reduced motion or no WebGL.
  const [useFallback, setUseFallback] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const simplify =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches;

    if (simplify) {
      setUseFallback(true);
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: false,
        antialias: false,
      });
    } catch {
      setUseFallback(true);
      return;
    }

    const ctx = gsap.context(() => {
      const gl = renderer.gl;
      gl.canvas.classList.add("h-full", "w-full", "block");
      container.appendChild(gl.canvas);

      const texture = new Texture(gl, { generateMipmaps: false });
      const program = new Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        uniforms: {
          uTexture: { value: texture },
          uResolution: { value: [1, 1] },
          uImageSize: { value: [1, 1] },
          uPointer: { value: [0.5, 0.5] },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uVelocity: { value: 0 },
          uReveal: { value: 0 },
        },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        texture.image = image;
        program.uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight];
        gsap.to(program.uniforms.uReveal, { value: 1, duration: 1.1, ease: "expo.out" });
      };
      image.onerror = () => setUseFallback(true);
      image.src = src;

      const resize = () => {
        const { clientWidth, clientHeight } = container;
        if (!clientWidth || !clientHeight) return;
        renderer.setSize(clientWidth, clientHeight);
        program.uniforms.uResolution.value = [clientWidth, clientHeight];
      };
      resize();

      const observer = new ResizeObserver(resize);
      observer.observe(container);

      const pointer = { x: 0.5, y: 0.5 };
      const onMove = (event: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        pointer.x = (event.clientX - rect.left) / rect.width;
        pointer.y = 1 - (event.clientY - rect.top) / rect.height;
      };
      const onEnter = () =>
        gsap.to(program.uniforms.uHover, { value: 1, duration: 0.65, ease: "expo.out" });
      const onLeave = () =>
        gsap.to(program.uniforms.uHover, { value: 0, duration: 0.85, ease: "power3.out" });

      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerenter", onEnter);
      container.addEventListener("pointerleave", onLeave);

      // Driven off the shared ticker so it stays in step with Lenis/ScrollTrigger.
      const render = (time: number) => {
        program.uniforms.uTime.value = time;
        program.uniforms.uPointer.value = [pointer.x, pointer.y];
        program.uniforms.uVelocity.value +=
          (velocityRef.current - program.uniforms.uVelocity.value) * 0.08;
        renderer.render({ scene: mesh });
      };
      gsap.ticker.add(render);

      return () => {
        gsap.ticker.remove(render);
        observer.disconnect();
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerenter", onEnter);
        container.removeEventListener("pointerleave", onLeave);
        image.onload = null;
        image.onerror = null;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        gl.canvas.remove();
      };
    }, containerRef);

    return () => ctx.revert();
  }, [src, velocityRef]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={alt}
      className={`relative h-full w-full overflow-hidden bg-black ${className}`}
    >
      {useFallback ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 767px) 100vw, 40vw"
          className="media-treat object-cover"
        />
      ) : null}
    </div>
  );
}
