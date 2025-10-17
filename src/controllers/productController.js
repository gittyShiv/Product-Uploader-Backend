import { processCSV } from "../utils/csvHandler.js";
import Product from "../models/Product.js";
import { Op } from "sequelize";

//CSV upload handling 
export const uploadCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await processCSV(req.file.path);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Getting all the products
export const getProducts = async (req, res) => {
  const { page, limit } = req.query;
  let products;
  if (page && limit) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    products = await Product.findAll({ limit: parseInt(limit), offset: offset });
  } else {
    products = await Product.findAll();
  }
  res.json(products);
};

// Search / filter the product
export const searchProducts = async (req, res) => {
  const { brand, color, minPrice, maxPrice } = req.query;
  const where = {};

  if (brand) where.brand = brand;
  if (color) where.color = color;
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice && { [Op.gte]: parseFloat(minPrice) }),
      ...(maxPrice && { [Op.lte]: parseFloat(maxPrice) }),
    };
  }

  const products = await Product.findAll({ where });
  res.json(products);
};
