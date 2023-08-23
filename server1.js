const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Connect to MongoDB (Make sure MongoDB is running)
mongoose.connect('mongodb://127.0.0.1:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to database');
});

// Define product schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

// Define service schema
const serviceSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const Product = mongoose.model('Product', productSchema);
const Service = mongoose.model('Service', serviceSchema);

// Simulated cart schema for simplicity (you might want to enhance this)
const cartSchema = new mongoose.Schema({
  type: String, // 'product' or 'service'
  itemId: mongoose.Schema.Types.ObjectId,
});

const CartItem = mongoose.model('CartItem', cartSchema);

// Create an account (not implemented in this example)
app.post('/account', (req, res) => {
  // Implement account creation logic here
  res.status(200).json({ message: 'Account created successfully' });
});

// Fetch all products and services
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find({});
    const services = await Service.find({});
    res.status(200).json({ products, services });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data' });
  }
});

// Add a product or service to the cart
app.post('/cart/add', async (req, res) => {
  const { type, itemId } = req.body;
  let item = null;

  try {
    if (type === 'product') {
      item = await Product.findOne({ _id: itemId });
    } else if (type === 'service') {
      item = await Service.findOne({ _id: itemId });
    }

    if (item) {
      await CartItem.create({ type, itemId });
      res.status(200).json({ message: 'Item added to cart' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error adding item to cart' });
  }
});

// Remove a product or service from the cart
app.post('/cart/remove', async (req, res) => {
  const { itemId } = req.body;

  try {
    await CartItem.findOneAndDelete({ itemId });
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing item from cart' });
  }
});

// Clear the cart
app.post('/cart/clear', async (req, res) => {
  try {
    await CartItem.deleteMany({});
    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

// Calculate tax based on price range
function calculateTax(price, taxRules) {
  let taxAmount = 0;

  for (const rule of taxRules) {
    if (price > rule.min && price <= rule.max) {
      taxAmount = price * (rule.taxPercentage / 100);
      break;
    }
  }

  return taxAmount;
}

// View total bill
app.get('/cart/total', async (req, res) => {
  try {
    const cartItems = await CartItem.find({});
    const taxRules = [
      { min: 1000, max: 5000, taxPercentage: 12 },
      { min: 5000, max: Infinity, taxPercentage: 18 },
    ];

    let totalPrice = 0;
    const itemsWithTotal = [];

    for (const cartItem of cartItems) {
      const item = cartItem.type === 'product'
        ? await Product.findOne({ _id: cartItem.itemId })
        : await Service.findOne({ _id: cartItem.itemId });

      if (item) {
        const tax = calculateTax(item.price, taxRules);
        const total = item.price + tax;
        totalPrice += total;
        itemsWithTotal.push({ ...item.toObject(), tax, total });
      }
    }

    res.status(200).json({ items: itemsWithTotal, totalPrice });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating total bill' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
