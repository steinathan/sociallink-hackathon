"use server";

import { adminDb, adminAuth, adminMessaging, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Sends a push notification to a specific user via Firebase Cloud Messaging.
 */
export async function sendPushNotification(
  receiverId: string,
  title: string,
  body: string,
  clickActionUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userDoc = await adminCollection("users").doc(receiverId).get();
    
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens as string[] | undefined;

    if (!tokens || tokens.length === 0) {
      return { success: false, error: "No FCM tokens found for user" };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        url: clickActionUrl,
      },
      webpush: {
        fcmOptions: {
          link: clickActionUrl,
        },
        notification: {
          icon: "/icons/web-app-manifest-192x192.png",
          badge: "/icons/favicon-96x96.png",
        }
      },
      tokens: tokens, // Send to all registered devices for this user
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    
    // Cleanup invalid tokens automatically
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await adminCollection("users").doc(receiverId).update({
          fcmTokens: FieldValue.arrayRemove(...failedTokens),
        });
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send push notification.";
    console.error("[sendPushNotification]", message);
    return { success: false, error: message };
  }
}

/**
 * Triggers a push notification for a new chat message.
 */
export async function notifyChatMessage(
  senderId: string,
  receiverId: string,
  chatId: string,
  messagePreview: string
) {
  try {
    // Get sender's profile to know who sent it
    const senderProfileDoc = await adminCollection("profiles").doc(senderId).get();
    const senderName = senderProfileDoc.data()?.displayName || "Someone";
    
    // Get chat to find the associated bookingId for the link
    const chatDoc = await adminCollection("chats").doc(chatId).get();
    const bookingId = chatDoc.data()?.bookingId;
    const targetUrl = bookingId ? `/bookings/${bookingId}` : "/messages";

    // 1. Send Push Notification
    await sendPushNotification(
      receiverId,
      `New message from ${senderName}`,
      messagePreview,
      targetUrl
    );

    // 2. Add to In-App Notifications Sub-collection
    await adminCollection("users")
      .doc(receiverId)
      .collection("notifications")
      .add({
        title: `New message from ${senderName}`,
        body: messagePreview,
        type: "NEW_MESSAGE",
        link: targetUrl,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    
    return { success: true };
  } catch (error) {
    console.error("[notifyChatMessage] Failed:", error);
    return { success: false };
  }
}

/**
 * Saves (or updates) the user's FCM device token in Firestore.
 * Called from the client after getOrRefreshFcmToken() resolves a token.
 *
 * Stores the token both:
 *  - As `users/{uid}.fcmTokens` (array — supports multi-device)
 *  - As a sub-collection `users/{uid}/fcmTokens/{token}` for easy cleanup
 */
export async function saveFcmToken(
  idToken: string,
  fcmToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminCollection("users").doc(uid);

    // Store as a deduplicated array field on the user doc
    await userRef.set(
      {
        fcmTokens: FieldValue.arrayUnion(fcmToken),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Also upsert the token sub-document with a timestamp (useful for stale token cleanup)
    await adminCollection("users")
      .doc(uid)
      .collection("fcmTokens")
      .doc(fcmToken)
      .set({
        token: fcmToken,
        createdAt: FieldValue.serverTimestamp(),
        platform: "web",
      });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save FCM token.";
    console.error("[saveFcmToken]", message);
    return { success: false, error: message };
  }
}

/**
 * Removes a specific FCM token from the user's Firestore record.
 * Call this when the user revokes notification permission.
 */
export async function removeFcmToken(
  idToken: string,
  fcmToken: string
): Promise<{ success: boolean }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminCollection("users").doc(uid);
    await userRef.update({
      fcmTokens: FieldValue.arrayRemove(fcmToken),
    });

    await adminCollection("users")
      .doc(uid)
      .collection("fcmTokens")
      .doc(fcmToken)
      .delete();

    return { success: true };
  } catch {
    return { success: false };
  }
}
