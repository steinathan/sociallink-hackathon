"use server";

import { adminStorage } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";

export async function uploadAvatarToStorage(
  base64Data: string,
  uid: string
): Promise<string> {
  try {
    const bucket = adminStorage.bucket();
    const fileName = `avatars/${uid}/avatar_${Date.now()}_${randomUUID()}.jpg`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), "base64");

    console.log(`[Storage] Starting upload for user: ${uid}`);
    console.log(`[Storage] Destination: ${fileName}`);
    console.log(`[Storage] Bucket: ${bucket.name}`);
    console.log(`[Storage] Size: ${(buffer.length / 1024).toFixed(2)} KB`);

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          ownerId: uid,
        },
      },
    });

    console.log(`[Storage] File saved successfully. Making public...`);
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log(`[Storage] Upload complete. Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[Storage] Critical upload error:", error);
    throw new Error("Failed to upload file to storage");
  }
}
