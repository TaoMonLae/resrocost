import { describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimit } from "@/lib/security/rate-limit";

describe("rate limiter", () => {
  it("blocks attempts over the limit until the window resets", () => {
    const key = "test:login@example.com";
    clearRateLimit(key);
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }, 100).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }, 200).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }, 300).allowed).toBe(false);
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }, 1200).allowed).toBe(true);
  });
});
