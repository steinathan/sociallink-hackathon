"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface StatCounterProps {
  value: string;
  className?: string;
}

export function StatCounter({ value, className }: StatCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const numericPart = parseFloat(value.replace(/[^0-9.]/g, ""));
  const suffix = value.replace(/[0-9.]/g, "");

  useEffect(() => {
    if (!counterRef.current) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: numericPart,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
        if (counterRef.current) {
          const formattedVal = obj.val % 1 === 0 ? obj.val.toFixed(0) : obj.val.toFixed(1);
          counterRef.current.innerText = formattedVal;
        }
      },
    });
  }, [numericPart]);

  return (
    <span className={className}>
      <span ref={counterRef}>0</span>
      {suffix}
    </span>
  );
}
