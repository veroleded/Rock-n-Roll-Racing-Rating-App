import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!token) {
    if (
      request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/matches") ||
      request.nextUrl.pathname.startsWith("/users")
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

  // Проверяем доступ к странице добавления матчей
  if (request.nextUrl.pathname.startsWith("/matches/add")) {
    if (token.role === "PLAYER") {
      return NextResponse.redirect(new URL("/matches", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/users/[id]/edit")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/users", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/matches/:path*", "/users/:path*"],
};
