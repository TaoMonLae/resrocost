import { describe, expect, it } from "vitest";
import { assertPermission, can } from "./permissions";

describe("role permissions", () => {
  it("gives owners full access", () => {
    expect(can("OWNER", "team:manage")).toBe(true);
    expect(can("OWNER", "records:delete")).toBe(true);
    expect(can("OWNER", "reports:financial")).toBe(true);
  });

  it("keeps viewers read only", () => {
    expect(can("VIEWER", "ingredients:read")).toBe(true);
    expect(can("VIEWER", "ingredients:write")).toBe(false);
    expect(can("VIEWER", "sales:write")).toBe(false);
  });

  it("limits kitchen staff to kitchen workflows", () => {
    expect(can("KITCHEN_STAFF", "stock:use")).toBe(true);
    expect(can("KITCHEN_STAFF", "waste:write")).toBe(true);
    expect(can("KITCHEN_STAFF", "reports:financial")).toBe(false);
  });

  it("throws on forbidden server operations", () => {
    expect(() => assertPermission("ACCOUNTANT", "team:manage")).toThrow(
      "Role ACCOUNTANT cannot perform team:manage",
    );
  });
});
