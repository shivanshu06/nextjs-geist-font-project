const express = require('express');
const { dbHelpers } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /orders/checkout - Process checkout
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { shipping_address, payment_method = 'mock' } = req.body;

    // Validation
    if (!shipping_address || !shipping_address.street || !shipping_address.city) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required'
      });
    }

    // Get cart items
    const cartItems = await dbHelpers.getCartByUserId(user_id);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Mock payment processing
    const paymentResult = await mockPaymentProcess(totalAmount, payment_method);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: paymentResult.error
      });
    }

    // Prepare order details
    const orderDetails = {
      items: cartItems.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: parseFloat(item.price) * item.quantity
      })),
      shipping_address,
      payment_method,
      payment_id: paymentResult.payment_id,
      order_date: new Date().toISOString()
    };

    // Create order
    const order = await dbHelpers.createOrder(user_id, totalAmount, orderDetails);

    // Clear cart after successful order
    await dbHelpers.clearCart(user_id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        total_amount: totalAmount,
        status: order.status,
        payment_id: paymentResult.payment_id,
        estimated_delivery: getEstimatedDelivery()
      }
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process checkout'
    });
  }
});

// GET /orders - Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const orders = await dbHelpers.getOrdersByUserId(user_id);

    // Parse order details for each order
    const ordersWithDetails = orders.map(order => ({
      ...order,
      order_details: JSON.parse(order.order_details)
    }));

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: ordersWithDetails
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

// GET /orders/:id - Get specific order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Validation
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid order ID is required'
      });
    }

    const orders = await dbHelpers.getOrdersByUserId(user_id);
    const order = orders.find(o => o.id === parseInt(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Parse order details
    const orderWithDetails = {
      ...order,
      order_details: JSON.parse(order.order_details)
    };

    res.json({
      success: true,
      message: 'Order retrieved successfully',
      data: orderWithDetails
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
});

// Mock payment processing function
const mockPaymentProcess = async (amount, paymentMethod) => {
  return new Promise((resolve) => {
    // Simulate payment processing delay
    setTimeout(() => {
      // Mock payment scenarios
      if (amount <= 0) {
        resolve({
          success: false,
          error: 'Invalid amount'
        });
        return;
      }

      // Simulate 95% success rate
      const isSuccess = Math.random() > 0.05;

      if (isSuccess) {
        resolve({
          success: true,
          payment_id: `mock_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: amount,
          method: paymentMethod,
          processed_at: new Date().toISOString()
        });
      } else {
        resolve({
          success: false,
          error: 'Payment declined by mock processor'
        });
      }
    }, 1000); // 1 second delay to simulate real payment processing
  });
};

// Helper function to calculate estimated delivery
const getEstimatedDelivery = () => {
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days from now
  return deliveryDate.toISOString().split('T')[0]; // Return date in YYYY-MM-DD format
};

module.exports = router;
