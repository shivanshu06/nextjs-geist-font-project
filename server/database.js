const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database.sqlite';

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Products table
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image TEXT,
        category TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Cart table
      db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`);

      // Orders table
      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        order_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database tables initialized');
          insertSampleData();
          resolve();
        }
      });
    });
  });
};

// Insert sample jewelry products
const insertSampleData = () => {
  const sampleProducts = [
    {
      name: 'Diamond Engagement Ring',
      description: 'Beautiful 1 carat diamond engagement ring in 18k white gold',
      price: 2999.99,
      image: 'https://placehold.co/400x400?text=Diamond+Engagement+Ring+with+sparkling+diamond+in+elegant+white+gold+setting',
      category: 'rings',
      stock: 5
    },
    {
      name: 'Pearl Necklace',
      description: 'Classic freshwater pearl necklace with sterling silver clasp',
      price: 299.99,
      image: 'https://placehold.co/400x400?text=Elegant+Pearl+Necklace+with+lustrous+white+pearls+and+silver+clasp',
      category: 'necklaces',
      stock: 10
    },
    {
      name: 'Gold Bracelet',
      description: 'Delicate 14k gold chain bracelet with heart charm',
      price: 599.99,
      image: 'https://placehold.co/400x400?text=Delicate+Gold+Bracelet+with+heart+charm+in+14k+yellow+gold',
      category: 'bracelets',
      stock: 8
    },
    {
      name: 'Sapphire Earrings',
      description: 'Stunning blue sapphire stud earrings in platinum setting',
      price: 1299.99,
      image: 'https://placehold.co/400x400?text=Blue+Sapphire+Stud+Earrings+in+elegant+platinum+setting',
      category: 'earrings',
      stock: 6
    },
    {
      name: 'Ruby Tennis Bracelet',
      description: 'Exquisite ruby tennis bracelet with diamonds in 18k gold',
      price: 3999.99,
      image: 'https://placehold.co/400x400?text=Ruby+Tennis+Bracelet+with+diamonds+in+luxurious+18k+gold',
      category: 'bracelets',
      stock: 3
    },
    {
      name: 'Emerald Pendant',
      description: 'Vintage-inspired emerald pendant with diamond halo',
      price: 1899.99,
      image: 'https://placehold.co/400x400?text=Emerald+Pendant+with+diamond+halo+in+vintage+inspired+design',
      category: 'necklaces',
      stock: 4
    }
  ];

  // Check if products already exist
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (err) {
      console.error('Error checking products:', err);
      return;
    }
    
    if (row.count === 0) {
      const stmt = db.prepare(`INSERT INTO products (name, description, price, image, category, stock) 
                               VALUES (?, ?, ?, ?, ?, ?)`);
      
      sampleProducts.forEach(product => {
        stmt.run([product.name, product.description, product.price, product.image, product.category, product.stock]);
      });
      
      stmt.finalize();
      console.log('Sample jewelry products inserted');
    }
  });
};

// Database helper functions
const dbHelpers = {
  // User operations
  createUser: (email, hashedPassword, name) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      stmt.run([email, hashedPassword, name], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, email, name });
        }
      });
      stmt.finalize();
    });
  },

  findUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Product operations
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM products ORDER BY created_at DESC", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  getProductById: (id) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Cart operations
  addToCart: (userId, productId, quantity) => {
    return new Promise((resolve, reject) => {
      // Check if item already exists in cart
      db.get("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update quantity if item exists
          const newQuantity = row.quantity + quantity;
          db.run("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", 
                 [newQuantity, userId, productId], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: row.id, user_id: userId, product_id: productId, quantity: newQuantity });
            }
          });
        } else {
          // Insert new item
          const stmt = db.prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
          stmt.run([userId, productId, quantity], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, user_id: userId, product_id: productId, quantity });
            }
          });
          stmt.finalize();
        }
      });
    });
  },

  getCartByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image 
        FROM cart c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
      `;
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  removeFromCart: (userId, productId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  },

  clearCart: (userId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM cart WHERE user_id = ?", [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  },

  // Order operations
  createOrder: (userId, totalAmount, orderDetails) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare("INSERT INTO orders (user_id, total_amount, order_details, status) VALUES (?, ?, ?, ?)");
      stmt.run([userId, totalAmount, JSON.stringify(orderDetails), 'completed'], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, user_id: userId, total_amount: totalAmount, status: 'completed' });
        }
      });
      stmt.finalize();
    });
  },

  getOrdersByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

module.exports = { db, initDatabase, dbHelpers };
