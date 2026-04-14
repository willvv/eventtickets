import { NextRequest, NextResponse } from "next/server";

// Server-side proxy for credentials sign-in.
// Bypasses browser cookie/CSRF issues by doing the auth server-to-server.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  if (!email || !password) {
    return NextResponse.redirect(new URL(`/auth/signin?error=missing`, req.url));
  }

  const base = process.env.NEXTAUTH_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // Step 1: get CSRF token (server-to-server)
  const csrfRes = await fetch(`${base}/api/auth/csrf`, {
    headers: { cookie: req.headers.get("cookie") || "" },
  });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken as string;
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];

  // Step 2: post credentials (server-to-server)
  const allCookies = [
    req.headers.get("cookie") || "",
    ...csrfCookies.map((c) => c.split(";")[0]),
  ]
    .filter(Boolean)
    .join("; ");

  const body = new URLSearchParams({
    csrfToken,
    callbackUrl,
    email,
    password,
  });

  const authRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: allCookies,
    },
    body: body.toString(),
    redirect: "manual",
  });

  // Step 3: forward session cookie and redirect
  const location = authRes.headers.get("location");
  const setCookieHeaders = authRes.headers.getSetCookie?.() ?? [];

  // Determine redirect target
  const redirectUrl = location || callbackUrl;
  const targetUrl = new URL(redirectUrl.startsWith("/") ? redirectUrl : new URL(redirectUrl).pathname, base);

  // Use 303 See Other so browser switches to GET after the POST
  const res = new NextResponse(null, {
    status: 303,
    headers: { location: targetUrl.toString() },
  });
  for (const cookie of setCookieHeaders) {
    res.headers.append("set-cookie", cookie);
  }
  for (const cookie of csrfCookies) {
    res.headers.append("set-cookie", cookie);
  }
  return res;
}
