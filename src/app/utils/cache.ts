import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class URLCache {
  private static CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
  private static MAX_CACHE_SIZE = 102400; // 100 KB

  static async get(url: string): Promise<string | null> {
    try {
      const cached = await redis.get<string>(this.getCacheKey(url));
      return cached || null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  static async set(url: string, content: string): Promise<void> {
    try {
      // Check if content size exceeds MAX_CACHE_SIZE
      if (Buffer.byteLength(content, "utf8") > this.MAX_CACHE_SIZE) {
        console.error("Content exceeds maximum cache size.");
        return; // Exit if content is too large
      }
      await redis.set(this.getCacheKey(url), content, {
        ex: this.CACHE_TTL,
      });
      console.log(`Caching successful for URL: ${url}`); // Log success message
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  private static getCacheKey(url: string): string {
    return `url_content:${url.substring(0, 200)}`;
  }
}
