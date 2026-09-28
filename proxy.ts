import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("laundry_session");
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    if (hasSession) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)).*)"],
};
