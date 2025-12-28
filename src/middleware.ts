import { NextResponse } from 'next/server';

export async function middleware() {
  // Middleware работает в Edge Runtime и не может использовать Node.js API
  // Метрики собираются в API routes, которые работают в Node.js runtime
  // См. src/app/api/trpc/[trpc]/route.ts для примера сбора метрик

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
