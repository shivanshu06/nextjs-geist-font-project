const express = require('express');
const { dbHelpers } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /cart/add - Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    // Check if product exists
    const product = await dbHelpers.getProductById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Add to cart
    const cartItem = await dbHelpers.addToCart(user_id, product_id, quantity);

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// GET /cart - Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const cartItems = await dbHelpers.getCartByUserId(user_id);

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    res.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        items: cartItems,
        total: parseFloat(total.toFixed(2)),
        itemCount: cartItems.length
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart'
    });
  }
});

// PUT /cart/update - Update cart item quantity
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    // Check if product exists
    const product = await dbHelpers.getProductById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Remove existing item and add with new quantity
    await dbHelpers.removeFromCart(user_id, product_id);
    const updatedItem = await dbHelpers.addToCart(user_id, product_id, quantity);

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedItem
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// DELETE /cart/remove - Remove item from cart
router.delete('/remove', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const result = await dbHelpers.removeFromCart(user_id, product_id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// DELETE /cart/clear - Clear entire cart
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await dbHelpers.clearCart(user_id);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: { itemsRemoved: result.changes }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;
