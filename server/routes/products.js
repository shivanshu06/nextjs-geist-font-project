const express = require('express');
const { dbHelpers } = require('../database');
const router = express.Router();

// GET /products - Get all products
router.get('/', async (req, res) => {
  try {
    const products = await dbHelpers.getAllProducts();
    
    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: products
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products'
    });
  }
});

// GET /products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required'
      });
    }

    const product = await dbHelpers.getProductById(parseInt(id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product'
    });
  }
});

// GET /products/category/:category - Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const products = await dbHelpers.getAllProducts();
    const filteredProducts = products.filter(product => 
      product.category && product.category.toLowerCase() === category.toLowerCase()
    );

    res.json({
      success: true,
      message: `Products in category '${category}' retrieved successfully`,
      data: filteredProducts
    });

  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products by category'
    });
  }
});

// GET /products/search/:query - Search products
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const products = await dbHelpers.getAllProducts();
    const searchResults = products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );

    res.json({
      success: true,
      message: `Search results for '${query}'`,
      data: searchResults
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
});

module.exports = router;
