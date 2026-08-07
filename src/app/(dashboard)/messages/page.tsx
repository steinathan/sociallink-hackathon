"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef } from "@/lib/firebase";
import {
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Chat } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { firebaseUser, userDoc } = useAuthStore();
  useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const field = userDoc?.role === "CONSULTANT" ? "consultantId" : "memberId";
    const q = query(
      getScopedCollectionRef(db, "chats"),
      where(field, "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(
        snap.docs.map((d) => ({ chatId: d.id, ...d.data() } as Chat))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseUser?.uid, userDoc?.role]);

  return (
    <div className="space-y-10">
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Messages
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          Conversations.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Secure in-app chats for your active sessions. Messages close with the session.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[24px]" />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card py-20 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            No active chats.
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            Chats open once a session is accepted — and close with it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Link
              key={chat.chatId}
              href={`/bookings/${chat.bookingId}`}
              className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-5 transition-all hover:border-primary/30 hover:shadow-[0_18px_45px_-25px_rgba(0,0,0,0.2)] sm:p-6"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-[15px] font-medium tracking-tight">
                    Session chat
                  </div>
                  <div className="mt-1 font-mono text-[12px] tabular-nums text-muted-foreground">
                    #{chat.bookingId.slice(-6).toUpperCase()} ·{" "}
                    {chat.createdAt
                      ? formatDistanceToNow(
                          (chat.createdAt as unknown as { toDate: () => Date }).toDate(),
                          { addSuffix: true }
                        )
                      : ""}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    chat.isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {chat.isActive ? "Active" : "Closed"}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
