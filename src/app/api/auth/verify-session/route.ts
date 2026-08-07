import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Don't check revocation on every request to prevent latency/clock skew issues
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
    });
  } catch (err) {
    console.error("[verify-session] Failed to verify cookie:", err);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
