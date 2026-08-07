"use client";

import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuth();
  return <>{children}</>;
}
