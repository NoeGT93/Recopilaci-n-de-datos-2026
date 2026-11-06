"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

/** Widget de Turnstile (render explícito). `resetKey` distinto → pide un token nuevo. */
export default function Turnstile({ siteKey, onToken, resetKey = 0 }: { siteKey: string; onToken: (t: string | null) => void; resetKey?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled || !el.current || !window.turnstile || id.current) return;
      id.current = window.turnstile.render(el.current, {
        sitekey: siteKey,
        language: "es",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    };
    if (window.turnstile) mount();
    else {
      const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      let s = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = src;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", mount);
    }
    return () => {
      cancelled = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && id.current && window.turnstile) {
      cb.current(null);
      window.turnstile.reset(id.current);
    }
  }, [resetKey]);

  return <div ref={el} style={{ minHeight: 65 }} />;
}
