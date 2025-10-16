import express from "express";
import multer from "multer";
import { uploadCSV, getProducts, searchProducts } from "../controllers/productController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/debug-upload", upload.single("file"), (req, res) => {
  console.log("DEBUG req.file:", req.file);
  res.json({ file: req.file, body: req.body });
});
router.post("/upload", upload.single("file"), uploadCSV);
router.get("/products", getProducts);
router.get("/products/search", searchProducts);

export default router;
