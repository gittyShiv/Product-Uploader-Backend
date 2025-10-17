import { validateProductRow } from "../src/utils/csvHandler.js";

describe("Product Validation", () => {
  it("should accept valid product", () => {
    const row = { sku: "s1", name: "Shirt", brand: "Puma", price: 900, mrp: 1000, quantity: 3 };
    const result = validateProductRow(row);
    expect(result.valid).toBe(true);
  });

  it("should reject missing mandatory fields", () => {
    const row = { sku: "", name: "Shoe" };
    const result = validateProductRow(row);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Missing/i);
  });

  it("should reject if price > MRP", () => {
    const row = { sku: "s2", name: "Hat", brand: "Adidas", price: 1200, mrp: 1000, quantity: 1 };
    const result = validateProductRow(row);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/greater/);
  });
});
