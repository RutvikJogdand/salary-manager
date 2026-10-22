import { describe, expect, it } from "vitest";
import { money } from "./format";
describe("display exact salary strings", () => {
  it("preserves cents beyond JavaScript safe integer range", () => {
    expect(money("99999999999999.99", "USD")).toBe("$99,999,999,999,999.99");
  });
  it("labels an empty statistic without calling it zero", () => {
    expect(money(null, "INR")).toBe("—");
  });
});
