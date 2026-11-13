import { describe, expect, it } from "vitest";
import { maskKey, open, seal } from "./secret-box";

const SECRET = "test-secret-that-is-long-enough-123";

describe("secret box (API key encryption)", () => {
  it("round-trips a key", () => {
    const key = "abcd1234-ef56-7890-abcd-1234567890ab:0123456789abcdef0123456789abcdef";
    const box = seal(key, SECRET);
    expect(box.data).not.toContain("abcd");
    expect(open(box, SECRET)).toBe(key);
  });

  it("uses a new IV every time", () => {
    expect(seal("same", SECRET).iv).not.toBe(seal("same", SECRET).iv);
  });

  it("fails with the wrong secret", () => {
    const box = seal("my-key", SECRET);
    expect(() => open(box, "another-secret-that-is-long-enough")).toThrow();
  });

  it("detects tampering", () => {
    const box = seal("my-key", SECRET);
    const bad = { ...box, data: Buffer.from("xx" + box.data).toString("base64") };
    expect(() => open(bad, SECRET)).toThrow();
  });

  it("refuses a missing secret", () => {
    expect(() => seal("x", "")).toThrow();
  });

  it("masks keys", () => {
    expect(maskKey("abcdef123456")).toBe("••••••3456");
  });
});
