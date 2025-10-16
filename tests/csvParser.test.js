import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jest } from "@jest/globals";

jest.setTimeout(20000);

// Mock Sequelize Product model
jest.unstable_mockModule("../src/models/Product.js", () => ({
  default: {
    bulkCreate: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
  },
}));


const { processCSV } = await import("../src/utils/csvHandler.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CSV Parsing (PostgreSQL)", () => {
  const samplePath = path.join(__dirname, "sample.csv");

  beforeAll(() => {
    fs.writeFileSync(
      samplePath,
      "sku,name,brand,price,mrp,quantity\nsku1,Shirt,Nike,800,1000,5\nsku2,,Adidas,500,700,2"
    );
  });

  afterAll(() => {
    if (fs.existsSync(samplePath)) fs.unlinkSync(samplePath);
  });

  it("should parse valid CSV and return result object", async () => {
    const result = await processCSV(samplePath);
    expect(result).toHaveProperty("stored");
    expect(result).toHaveProperty("failed");
  });

  it("should store valid rows and reject invalid ones", async () => {
    const result = await processCSV(samplePath);
    expect(result.stored).toBe(1);
    expect(result.failed.length).toBeGreaterThan(0);
  });
});



