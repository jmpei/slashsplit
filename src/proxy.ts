// Optimistic redirect: app pages send visitors without a session cookie to sign-in. Pages still
// check the session on the server; a cookie here is not proof of sign-in.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/households/:path*"],
};
