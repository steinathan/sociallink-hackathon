import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const authRequiredPaths = ["/dashboard", "/explore", "/bookings", "/wallet", "/profile", "/messages"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("__session")?.value;

  const isAuthRequired = authRequiredPaths.some((p) => pathname.startsWith(p));

  // If no session cookie, redirect to login
  if (isAuthRequired && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For auth routes, verify the session server-side
  if (isAuthRequired && sessionCookie) {
    try {
      const verifyUrl = new URL("/api/auth/verify-session", request.url);
      const res = await fetch(verifyUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `__session=${sessionCookie}`,
        },
      });

      if (!res.ok) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }

      const data = await res.json();

      if (!data.authenticated) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      // If verification fails, allow through
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/explore/:path*",
    "/bookings/:path*",
    "/wallet/:path*",
    "/profile/:path*",
    "/messages/:path*",
  ],
};
