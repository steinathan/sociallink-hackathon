"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { db, storage } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ImageIcon, Loader2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyChatMessage } from "@/actions/notifications.actions";
import { playNotificationSound } from "@/lib/audio";

interface ChatWindowProps {
  chatId: string;
  memberId: string;
  consultantId: string;
  isActive: boolean;
}

export function ChatWindow({
  chatId,
  memberId,
  consultantId,
  isActive,
}: ChatWindowProps) {
  const { firebaseUser } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!chatId || !firebaseUser?.uid) return;

    const messagesRef = getScopedCollectionRef(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      // Play a sound if it's a new incoming message from the other person
      // and it's not the initial fetch of messages.
      if (!isFirstRender.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            if (msg.senderId !== firebaseUser.uid) {
              playNotificationSound();
            }
          }
        });
      }

      setMessages(
        snap.docs.map(
          (d) => ({ messageId: d.id, ...d.data() } as ChatMessage)
        )
      );

      isFirstRender.current = false;
    });

    return () => unsub();
  }, [chatId, firebaseUser?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !firebaseUser?.uid || !isActive) return;

    setSending(true);
    const receiverId = firebaseUser.uid === memberId ? consultantId : memberId;
    const messagePreview = text.trim();

    try {
      await addDoc(getScopedCollectionRef(db, "chats", chatId, "messages"), {
        senderId: firebaseUser.uid,
        text: messagePreview,
        createdAt: serverTimestamp(),
      });
      setText("");
      
      // Fire and forget push notification
      notifyChatMessage(firebaseUser.uid, receiverId, chatId, messagePreview);
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File) {
    if (!firebaseUser?.uid || !isActive) return;

    setUploading(true);
    const receiverId = firebaseUser.uid === memberId ? consultantId : memberId;

    try {
      const storageRef = ref(
        storage,
        `chats/${chatId}/${Date.now()}_${file.name}`
      );
      console.log(`[Chat Upload] Starting upload for chat: ${chatId}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      console.log(`[Chat Upload] Success: ${imageUrl}`);

      await addDoc(getScopedCollectionRef(db, "chats", chatId, "messages"), {
        senderId: firebaseUser.uid,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      // Fire and forget push notification
      notifyChatMessage(firebaseUser.uid, receiverId, chatId, "Sent an image 📷");
    } catch {
      toast.error("Failed to send image.");
    } finally {
      setUploading(false);
    }
  }

  function toggleReveal(messageId: string) {
    setRevealedImages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  const myUid = firebaseUser?.uid;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-sm">Session Chat</h3>
        {!isActive && (
          <span className="text-xs text-muted-foreground">Chat closed</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === myUid;
          const isRevealed = revealedImages.has(msg.messageId);

          return (
            <div
              key={msg.messageId}
              className={cn(
                "flex items-end gap-2",
                isMine ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {msg.senderId === memberId ? "M" : "C"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {msg.text && <p>{msg.text}</p>}
                {msg.imageUrl && (
                  <div className="relative mt-1">
                    {isRevealed ? (
                      <img
                        src={msg.imageUrl}
                        alt="Shared image"
                        className="max-w-full rounded-lg"
                      />
                    ) : (
                      <div
                        className="flex h-32 w-48 cursor-pointer items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm"
                        onClick={() => toggleReveal(msg.messageId)}
                      >
                        <div className="text-center text-white">
                          <Eye className="mx-auto mb-1 h-5 w-5" />
                          <p className="text-xs">Click to reveal</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-0.5 text-[10px] opacity-60">
                  {msg.createdAt
                    ? formatDistanceToNow(
                        (msg.createdAt as unknown as { toDate: () => Date }).toDate(),
                        { addSuffix: true }
                      )
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isActive ? (
        <div className="flex items-center gap-2 border-t border-border p-3">
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendImage(file);
              }}
            />
          </label>
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={sending || uploading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          Chat is closed. Session has ended.
        </div>
      )}
    </div>
  );
}
