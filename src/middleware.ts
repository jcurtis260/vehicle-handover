import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/handovers/:path*",
    "/search/:path*",
    "/settings/:path*",
    "/api/handovers/:path*",
    "/api/upload/:path*",
    "/api/users/:path*",
  ],
};
