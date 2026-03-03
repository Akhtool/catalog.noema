"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type RectLike = { left: number; top: number; width: number; height: number };

type FlyToCartDetail = {
  from: RectLike;
  imageSrc?: string | null;
  fly?: boolean;
};

type FlyItem = {
  id: string;
  from: RectLike;
  to: RectLike;
  imageSrc?: string | null;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function rectToLike(r: DOMRect): RectLike {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function pickVisibleCartTarget(): HTMLElement | null {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-cart-target='true']"),
  );
  if (els.length === 0) return null;

  for (const el of els) {
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (
      r.bottom < 0 ||
      r.right < 0 ||
      r.left > window.innerWidth ||
      r.top > window.innerHeight
    )
      continue;
    return el;
  }

  return els[0] ?? null;
}

function bump(el: HTMLElement): void {
  el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
    { duration: 220, easing: "ease-out" },
  );
}

export function CartFlyLayer() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<FlyItem[]>([]);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const bumpTargetByIdRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onFly = (e: Event) => {
      const ce = e as CustomEvent<FlyToCartDetail>;
      const detail = ce.detail;
      if (!detail?.from) return;

      const target = pickVisibleCartTarget();
      if (!target) return;

      const shouldFly = detail.fly !== false;
      if (reduced || !shouldFly) {
        bump(target);
        return;
      }

      const to = rectToLike(target.getBoundingClientRect());
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      bumpTargetByIdRef.current.set(id, target);

      setItems((prev) => [
        ...prev,
        { id, from: detail.from, to, imageSrc: detail.imageSrc ?? null },
      ]);
    };

    window.addEventListener("catalog:fly-to-cart", onFly as EventListener);
    return () => window.removeEventListener("catalog:fly-to-cart", onFly as EventListener);
  }, [reduced]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {items.map((it) => (
        <FlyThumb
          key={it.id}
          item={it}
          onDone={() => {
            const target = bumpTargetByIdRef.current.get(it.id);
            if (target) bump(target);
            bumpTargetByIdRef.current.delete(it.id);
            setItems((prev) => prev.filter((x) => x.id !== it.id));
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

function FlyThumb({ item, onDone }: { item: FlyItem; onDone: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const startX = item.from.left + item.from.width / 2;
    const startY = item.from.top + item.from.height / 2;
    const endX = item.to.left + item.to.width / 2;
    const endY = item.to.top + item.to.height / 2;

    const dx = endX - startX;
    const dy = endY - startY;

    const anim = el.animate(
      [
        { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
        { transform: `translate3d(${dx * 0.7}px, ${dy * 0.25 - 90}px, 0) scale(0.75)`, opacity: 1 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.2)`, opacity: 0.15 },
      ],
      {
        duration: 650,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards",
      },
    );

    let cancelledByCleanup = false;
    anim.onfinish = onDone;
    anim.oncancel = () => {
      // React StrictMode в dev вызывает cleanup эффекта сразу после первого запуска.
      // В этом случае отмена анимации не должна удалять элемент, иначе "полет" не виден.
      if (!cancelledByCleanup) onDone();
    };
    return () => {
      cancelledByCleanup = true;
      anim.cancel();
    };
  }, [item, onDone]);

  const size = 40;
  const left = item.from.left + item.from.width / 2 - size / 2;
  const top = item.from.top + item.from.height / 2 - size / 2;
  const safeUrl =
    item.imageSrc && item.imageSrc.trim().length > 0 ? `url("${item.imageSrc}")` : null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left,
        top,
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: "rgba(250, 204, 21, 0.92)",
        backgroundImage: safeUrl ?? undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        outline: "1px solid rgba(255,255,255,0.65)",
        transform: "translate3d(0,0,0)",
      }}
    />
  );
}

