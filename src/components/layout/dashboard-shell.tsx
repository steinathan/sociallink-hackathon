"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { revokeSessionCookie } from "@/actions/user.actions";
import { ThemeToggle } from "./theme-toggle";
import { LogoFull } from "./logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LocationRestricted } from "@/components/location-restricted";
import { GlobalLocationBanner } from "./global-location-banner";
import { PushNotificationPrompt } from "./push-notification-prompt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Compass,
  CalendarCheck,
  Wallet,
  User,
  MessageSquare,
  LogOut,
  Menu,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserBookings } from "@/hooks/use-user-bookings";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/bookings", icon: CalendarCheck, label: "Bookings" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
  { href: "/wallet/crypto", icon: Wallet, label: "Crypto Wallet" },
  { href: "/ai-assistant", icon: Sparkles, label: "AI Assistant" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/profile", icon: User, label: "Profile" },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const { userDoc } = useAuthStore();
  const { pendingCount } = useUserBookings();

  const visibleNavItems = navItems.filter((item) => {
    if (userDoc?.role === "ADMIN") {
      // Web3 + AI surface area is for MEMBER + CONSULTANT only.
      if (item.href === "/wallet/crypto" || item.href === "/ai-assistant") return false;
    }
    if (item.href === "/explore" && userDoc?.role === "CONSULTANT") return false;
    return true;
  });

  return (
    <nav className="space-y-0.5">
      <div className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Workspace
      </div>
      {visibleNavItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const showBadge = href === "/bookings" && pendingCount > 0;

        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
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
                "h-[15px] w-[15px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
              strokeWidth={isActive ? 2 : 1.6}
            />
            <span className="flex-1">{label}</span>
            {showBadge && (
              <span
                className={cn(
                  "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                )}
              >
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  useAuth();

  async function handleSignOut() {
    try {
      await revokeSessionCookie();
      await signOut(auth);
      useAuthStore.getState().reset();
      router.push("/");
      toast.success("Signed out");
    } catch {
      toast.error("Failed to sign out");
    }
  }

  const initials = userDoc?.phoneNumber
    ? userDoc.phoneNumber.slice(-4)
    : "··";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalLocationBanner />
      <LocationRestricted />
      <PushNotificationPrompt />
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-10 hidden h-screen w-64 flex-col border-r border-foreground/[0.06] bg-background lg:flex">
          <div className="flex h-20 items-center border-b border-foreground/[0.06] px-6">
            <LogoFull />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-7">
            <NavLinks />
          </div>

          {/* Role card */}
          <div className="border-t border-foreground/[0.06] p-4">
            <div className="rounded-2xl border border-foreground/[0.06] bg-card p-4">
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Signed in as
              </div>
              <div className="mt-2 font-serif text-base font-medium tracking-tight">
                {userDoc?.role === "CONSULTANT" ? "Consultant" : "Member"}
              </div>
              <div className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {userDoc?.phoneNumber ?? "—"}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:pl-64 flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="sticky top-10 z-40 flex h-16 items-center justify-between border-b border-foreground/[0.06] bg-background/85 px-4 backdrop-blur-xl md:px-8">
            <Sheet>
              <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden">
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-r-foreground/[0.06] bg-background p-0">
                <div className="flex h-20 items-center border-b border-foreground/[0.06] px-6">
                  <LogoFull />
                </div>
                <div className="px-4 py-7">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-primary/20">
                  <Avatar className="h-9 w-9 border border-foreground/[0.06]">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-[11px] font-medium text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border-foreground/[0.08] bg-card p-2"
                >
                  <div className="px-2.5 pb-2 pt-1">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Account
                    </div>
                    <div className="mt-1 font-serif text-sm font-medium">
                      {userDoc?.role === "CONSULTANT" ? "Consultant" : "Member"}
                    </div>
                    <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {userDoc?.phoneNumber ?? "—"}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-foreground/[0.06]" />
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer rounded-xl"
                  >
                    <User className="h-4 w-4" strokeWidth={1.5} />
                    My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/wallet")}
                    className="cursor-pointer rounded-xl"
                  >
                    <Wallet className="h-4 w-4" strokeWidth={1.5} />
                    Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-foreground/[0.06]" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer rounded-xl text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
