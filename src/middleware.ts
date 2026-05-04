import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as { passwordExpired?: boolean } | null;

    if (token?.passwordExpired && !pathname.startsWith("/password")) {
      const url = req.nextUrl.clone();
      url.pathname = "/password";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/handovers/:path*",
    "/search/:path*",
    "/settings/:path*",
    "/password/:path*",
    "/api/handovers/:path*",
    "/api/upload/:path*",
    "/api/users/:path*",
  ],
};
