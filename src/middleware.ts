import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  console.log("Token in middleware:", {
    path: request.nextUrl.pathname,
    token: {
      id: token?.id,
      role: token?.role,
      hasJoinedBot: token?.hasJoinedBot,
    },
  });

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!token) {
    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/dashboard")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Проверяем, присоединился ли пользователь к боту
  if (
    !token.hasJoinedBot &&
    !request.nextUrl.pathname.startsWith("/join-bot") &&
    !request.nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/join-bot", request.url));
  }

  // Проверяем доступ к админке
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (token.role !== "ADMIN" && token.role !== "MODERATOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
