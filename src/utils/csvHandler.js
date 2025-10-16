import csv from "csv-parser";
import fs from "fs";
import Product from "../models/Product.js";

// Validating product row
export const validateProductRow = (row) => {
  try {
    const product = {
      sku: row.sku?.trim(),
      name: row.name?.trim(),
      brand: row.brand?.trim(),
      color: row.color?.trim() || null,
      size: row.size?.trim() || null,
      mrp: parseFloat(row.mrp),
      price: parseFloat(row.price),
      quantity: parseInt(row.quantity || 0),
    };

    if (!product.sku || !product.name || !product.brand)
      throw new Error("Required fields is missing");
    if (isNaN(product.mrp) || isNaN(product.price))
      throw new Error("Numeric Value Invalid");
    if (product.price > product.mrp)
      throw new Error("Price cannot be greater than MRP");
    if (product.quantity < 0)
      throw new Error("Quantity cannot be negative");

    return { valid: true, data: product };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

// parse and save to db
export const processCSV = async (filePath) => {
  const results = [];
  const failed = [];
  const skipDB = process.env.NODE_ENV === "test";

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const validated = validateProductRow(row);
        if (validated.valid) results.push(validated.data);
        else failed.push({ row, error: validated.error });
      })
      .on("end", async () => {
        if (!skipDB && results.length) {
          await Product.bulkCreate(results, { ignoreDuplicates: true });
        }
        resolve({ stored: results.length, failed });
      })
      .on("error", reject);
  });
};
