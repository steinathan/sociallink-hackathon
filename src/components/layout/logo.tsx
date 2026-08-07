import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src="/icons/web-app-manifest-512x512.png"
        alt="SocialLink Logo"
        fill
        className="object-contain"
        sizes="(max-width: 768px) 48px, 96px"
      />
    </div>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 transition-opacity hover:opacity-80",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/[0.08] bg-card p-1.5">
        <Logo className="h-full w-full" />
      </div>
      <span className="font-serif text-lg font-medium tracking-tight">
        Social<span className="text-primary">Link</span>
      </span>
    </Link>
  );
}
