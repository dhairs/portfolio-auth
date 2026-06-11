import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ isAuthenticated: false, user: null });
    }

    // Verify session cookie, check if revoked
    const adminAuth = getAdminAuth();
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email || null,
        name: decodedClaims.name || null,
        picture: decodedClaims.picture || null,
      },
    });
  } catch (error) {
    console.error("Session verification failed:", error);
    
    // Clean up invalid cookie if verification failed
    try {
      const cookieStore = await cookies();
      const cookieOptions: any = {
        name: "__session",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 0,
      };

      if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
      }

      cookieStore.set(cookieOptions);
    } catch (cookieError) {
      console.error("Failed to clear invalid cookie:", cookieError);
    }

    return NextResponse.json({ isAuthenticated: false, user: null });
  }
}
