import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;

  if (!token) {
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/matches') ||
      pathname.startsWith('/users')
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (!token.hasJoinedBot && !pathname.startsWith('/join-bot') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/join-bot', request.url));
  }

  const isMatchAdd = pathname === '/matches/add' || pathname.startsWith('/matches/add/');
  const isMatchEdit = /^\/matches\/[^/]+\/edit$/.test(pathname);
  const isUserEdit = /^\/users\/[^/]+\/edit$/.test(pathname);

  if (isMatchAdd) {
    if (token.role === 'PLAYER') {
      return NextResponse.redirect(new URL('/matches', request.url));
    }
  }

  if (isUserEdit) {
    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/users', request.url));
    }
  }

  if (isMatchEdit) {
    if (token.role === 'PLAYER') {
      return NextResponse.redirect(new URL('/matches', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/matches/:path*", "/users/:path*"],
};
