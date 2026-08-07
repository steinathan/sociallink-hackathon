"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { revokeSessionCookie } from "@/actions/user.actions";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoFull } from "@/components/layout/logo";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/disputes", icon: AlertTriangle, label: "Disputes" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userDoc } = useAuthStore();
  const { isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setAuthChecked(true);
    if (!userDoc) router.replace("/login");
  }, [isLoading, userDoc, router]);

  if (isLoading || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (userDoc && userDoc.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" strokeWidth={1.5} />
          </div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-destructive">
            403 · Forbidden
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight">
            Access denied.
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground">
            This area is reserved for platform administrators.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="btn-coral mt-8 inline-flex h-12 items-center rounded-full px-6 text-[13px] font-semibold tracking-tight"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await revokeSessionCookie();
    await signOut(auth);
    useAuthStore.getState().reset();
    router.push("/login");
    toast.success("Signed out");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-foreground/[0.06] bg-background transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-foreground/[0.06] px-6">
          <LogoFull />
          <button
            type="button"
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-7">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Admin
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-2.5 py-1">
            <ShieldAlert className="h-3 w-3 text-destructive" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
              Operator
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-4">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-[15px] w-[15px]",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  strokeWidth={isActive ? 2 : 1.6}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-foreground/[0.06] p-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-foreground/[0.06] bg-background/85 px-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div className="hidden font-serif text-[15px] font-light tracking-tight md:block">
            Admin console
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Admin
            </span>
          </div>
        </header>
        <main className="px-4 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  );
}
