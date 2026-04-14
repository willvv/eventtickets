import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@/types/roles";

const PUBLIC_PATHS = [
  "/",
  "/auth/signin",
  "/auth/error",
  "/auth/verify-request",
  "/o/",
  "/claim/",
  "/orders/",
  "/events/",
  "/api/auth/",
  "/api/login",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as Role | undefined;

    // Superadmin only area
    if (pathname.startsWith("/superadmin") && role !== Role.SUPERADMIN) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Org area — requires org_admin or org_staff
    if (
      pathname.startsWith("/org/") &&
      role !== Role.ORG_ADMIN &&
      role !== Role.ORG_STAFF &&
      role !== Role.SUPERADMIN
    ) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;
        if (isPublicPath(pathname)) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
