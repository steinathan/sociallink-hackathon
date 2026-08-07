"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { AppNotification } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { useRouter } from "next/navigation";

export function NotificationBell() {
  const { firebaseUser } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const notifRef = collection(
      db,
      "users",
      firebaseUser.uid,
      "notifications"
    );
    const q = query(notifRef, orderBy("createdAt", "desc"), limit(20));

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AppNotification)
      );
      setNotifications(notifs);

      // Show toast for new unread notifications
      const newest = notifs[0];
      if (newest && !newest.read && newest.id !== lastNotificationId) {
        setLastNotificationId(newest.id);
        
        toast(newest.title, { 
          description: newest.body,
          action: newest.bookingId ? {
            label: "View Booking",
            onClick: () => router.push(`/bookings/${newest.bookingId}`)
          } : undefined,
          duration: 8000,
        });
      }
    });

    return () => unsub();
  }, [firebaseUser?.uid, lastNotificationId, router]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!firebaseUser?.uid) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        updateDoc(
          getScopedDocRef(db, "users", firebaseUser.uid, "notifications", n.id),
          { read: true }
        )
      )
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b border-border px-4 py-3 last:border-0 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.createdAt
                    ? formatDistanceToNow(n.createdAt.toDate(), {
                        addSuffix: true,
                      })
                    : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
