import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // For now, just pass through all requests
  // Auth will be handled by NextAuth when configured
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sounds|stockfish).*)",
  ],
};