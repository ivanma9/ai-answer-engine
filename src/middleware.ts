// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ratelimit } from "@/app/utils/ratelimiter";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  console.log(ip);
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  const response = success
    ? NextResponse.next()
    : NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
