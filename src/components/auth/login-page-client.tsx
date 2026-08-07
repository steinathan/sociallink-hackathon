"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useAuthStore } from "@/store/auth-store";

export function LoginPageClient() {
  const { firebaseUser, isLoading } = useAuthStore();
  const router = useRouter();
  const sceneRef = useRef<HTMLDivElement>(null);

  // Auto-redirect signed-in users away from the login page — no modal.
  useEffect(() => {
    if (!isLoading && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, isLoading, router]);

  useEffect(() => {
    const root = sceneRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };
        if (reduceMotion) {
          gsap.set(root.querySelectorAll("[data-auth-reveal]"), { opacity: 1, y: 0 });
          return;
        }

        gsap.fromTo(
          root.querySelectorAll("[data-auth-reveal]"),
          { opacity: 0, y: 24, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.08,
          }
        );

        gsap.to(root.querySelectorAll("[data-auth-particle]"), {
          y: "random(-30, 30)",
          x: "random(-20, 20)",
          opacity: "random(0.1, 0.3)",
          duration: "random(8, 14)",
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.15, from: "random" },
        });
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={sceneRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Warm wash — replaces cold teal/cyan radial */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.66_0.13_30/0.10),transparent_45%),radial-gradient(circle_at_80%_85%,oklch(0.78_0.075_85/0.10),transparent_50%)]" />

      {/* Floating particles in primary */}
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={index}
          data-auth-particle
          className="absolute rounded-full bg-primary/25 backdrop-blur-sm"
          style={{
            width: `${(index % 4) * 4 + 4}px`,
            height: `${(index % 4) * 4 + 4}px`,
            left: `${(index * 13) % 100}%`,
            top: `${(index * 17) % 100}%`,
            opacity: 0.1,
          }}
        />
      ))}
    </div>
  );
}
