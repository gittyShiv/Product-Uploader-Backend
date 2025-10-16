import { jest } from "@jest/globals";
import { Op } from "sequelize";

// Mock Sequelize Product model
jest.unstable_mockModule("../src/models/Product.js", () => ({
  default: {
    findAll: jest.fn().mockImplementation(({ where }) => {
      const data = [
        { sku: "a1", name: "Shoe", brand: "Nike", color: "Red", price: 900, mrp: 1000, quantity: 3 },
        { sku: "a2", name: "Shirt", brand: "Adidas", color: "Blue", price: 600, mrp: 800, quantity: 2 },
        { sku: "a3", name: "Cap", brand: "Puma", color: "Red", price: 300, mrp: 400, quantity: 5 },
      ];
      //handle Sequelize-style filters
      return data.filter((p) => {
        if (where?.brand && p.brand !== where.brand) return false;
        if (where?.color && p.color !== where.color) return false;
        if (where?.price) {
          const min = where.price[Op.gte];
          const max = where.price[Op.lte];
          if (min && p.price < min) return false;
          if (max && p.price > max) return false;
        }
        return true;
      });
    }),
  },
}));

//Import after mocks
const { searchProducts } = await import("../src/controllers/productController.js");

describe("Product Filters", () => {
  it("should filter by brand", async () => {
    const req = { query: { brand: "Nike" } };
    const res = { json: jest.fn() };
    await searchProducts(req, res);
    expect(res.json.mock.calls[0][0].length).toBe(1);
  });

  it("should filter by color", async () => {
    const req = { query: { color: "Red" } };
    const res = { json: jest.fn() };
    await searchProducts(req, res);
    expect(res.json.mock.calls[0][0].length).toBe(2);
  });

  it("should filter by price range", async () => {
    const req = { query: { minPrice: 500, maxPrice: 800 } };
    const res = { json: jest.fn() };
    await searchProducts(req, res);
    const data = res.json.mock.calls[0][0];
    expect(data.length).toBe(1);
    expect(data[0].brand).toBe("Adidas");
  });
});


