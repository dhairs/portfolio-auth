import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // Set session expiration to 5 days
    const expiresIn = 5 * 24 * 60 * 60 * 1000;

    // Create the session cookie
    const adminAuth = getAdminAuth();
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieOptions: any = {
      name: "__session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 5 * 24 * 60 * 60, // 5 days in seconds
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    // Set the cookie
    cookieStore.set(cookieOptions);

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Unauthorized session creation" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  try {
    
    const cookieOptions: any = {
      name: "__session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0, // Expire immediately
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    cookieStore.set(cookieOptions);

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
