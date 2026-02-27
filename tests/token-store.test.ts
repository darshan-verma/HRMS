import { describe, expect, it } from "vitest";
import { hashToken } from "@/lib/auth/token-store";

describe("token hashing", () => {
  it("is deterministic for the same token", () => {
    const token = "sample-refresh-token";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("changes when token changes", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});
