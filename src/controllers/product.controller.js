import { Product } from "../models/Product.model.js";


export const createProducts = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not found in token" });
    }

    const userId = req.user._id;
    console.log(userId)


    let products = req.body; 
    if (!Array.isArray(products)) {
      products = [products];
    }

    products = products.map(product => ({
      ...product,
      user: userId,
      totalPurchased: 0,
      purchasedBy: [],
      orderRef: [],
    }));

    const createdProducts = await Product.insertMany(products);

    res.status(201).json({
      message: `${createdProducts.length} product(s) created successfully!`,
      products: createdProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create product(s)",
      error: error.message,
    });
  }
};



// GET all products (with optional filters)
export const getProducts = async (req, res) => {
  try {
    const { userId, name, inStock } = req.query;

    // Build dynamic filter
    const filter = {};
    if (userId) filter.user = userId;
    if (name) filter.name = { $regex: name, $options: "i" }; // case-insensitive search
    if (inStock !== undefined) filter.inStock = inStock === "true";

    // Fetch products
    const products = await Product.find(filter)
      .populate("user", "name email") // optional: populate user info
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find product by _id
    const product = await Product.findById(id).populate("user", "email");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};