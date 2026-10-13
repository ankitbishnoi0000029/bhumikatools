import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "idcardtools.com";
const KNOWN_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const rawHost = (forwardedHost ?? hostHeader ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const hostname = rawHost.split(":")[0];

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = (forwardedProto ?? "https")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (
    KNOWN_HOSTS.has(hostname) &&
    (hostname !== CANONICAL_HOST || proto !== "https")
  ) {
    const url = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `https://${CANONICAL_HOST}`
    );
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
