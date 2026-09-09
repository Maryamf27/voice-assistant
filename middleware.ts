import { NextResponse, type NextRequest } from "next/server";
const COOKIE_NAME = "voice_studio_session";
export function middleware(request: NextRequest) { if (!request.cookies.get(COOKIE_NAME)?.value) return NextResponse.redirect(new URL("/login", request.url)); return NextResponse.next(); }
export const config = { matcher: ["/dashboard/:path*"] };
