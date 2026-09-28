"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [intersected, setIntersected] = useState(false);
  const visible = prefersReducedMotion || intersected;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersected(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={`planio-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--planio-reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function Marquee({
  items,
  reverse = false,
  className = "",
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
}) {
  const loop = [...items, ...items];

  return (
    <div
      className={`planio-marquee ${className}`}
      aria-label={items.join(", ")}
    >
      <div
        className={`planio-marquee-track ${reverse ? "is-reverse" : ""}`}
      >
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="planio-marquee-item"
            aria-hidden={i >= items.length}
          >
            {item}
            <span className="planio-marquee-dot" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}
