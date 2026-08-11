"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 900px)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    const resetWorkspaceScroll = () => lenis.scrollTo(0, { immediate: true, force: true });
    window.addEventListener("nla:navigate", resetWorkspaceScroll);

    return () => {
      window.removeEventListener("nla:navigate", resetWorkspaceScroll);
      lenis.destroy();
    };
  }, []);

  return null;
}
