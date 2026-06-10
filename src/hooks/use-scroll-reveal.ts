"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for scroll-triggered reveal animations.
 * Attaches an IntersectionObserver to the returned ref and sets
 * `isRevealed` to true once the element enters the viewport.
 */
export function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isRevealed };
}
