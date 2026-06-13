/**
 * Seed script: creates a Super Admin, one demo restaurant with owner/staff,
 * 5 tables with QR tokens, categories, menu items and inventory.
 *
 * Run from backend/:  npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const base = './src/models/';
const Restaurant = require(base + 'Restaurant');
const User = require(base + 'User');
const Table = require(base + 'Table');
const Category = require(base + 'Category');
const MenuItem = require(base + 'MenuItem');
const InventoryItem = require(base + 'InventoryItem');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant_os');
  console.log('connected, seeding...');

  // Super Admin
  let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!superAdmin) {
    superAdmin = new User({ name: 'Platform Admin', email: 'admin@platform.com', role: 'SUPER_ADMIN' });
    await superAdmin.setPassword('SuperAdmin@123');
    await superAdmin.save();
    console.log('Super Admin: admin@platform.com / SuperAdmin@123');
  }

  if (await Restaurant.findOne({ code: 'R102' })) {
    console.log('Demo restaurant already exists, skipping.');
    return mongoose.disconnect();
  }

  const restaurant = await Restaurant.create({
    name: 'Spice Garden', code: 'R102', email: 'owner@spicegarden.com',
    phone: '+91 98765 43210', address: 'Connaught Place, New Delhi',
    plan: 'STANDARD', tableLimit: 10, taxPercent: 5
  });

  const mk = async (name, email, role, pwd) => {
    const u = new User({ restaurantId: restaurant._id, name, email, role });
    await u.setPassword(pwd);
    await u.save();
    console.log(`${role}: ${email} / ${pwd}`);
  };
  await mk('Ravi Owner', 'owner@spicegarden.com', 'OWNER', 'Owner@1234');
  await mk('Meera Manager', 'manager@spicegarden.com', 'MANAGER', 'Manager@1234');
  await mk('Arjun Waiter', 'waiter@spicegarden.com', 'WAITER', 'Waiter@1234');
  await mk('Kitchen One', 'kitchen@spicegarden.com', 'KITCHEN', 'Kitchen@1234');

  const tables = [];
  for (let n = 1; n <= 5; n++) {
    tables.push(await Table.create({
      restaurantId: restaurant._id, number: n, capacity: 4,
      qrCode: uuid().replace(/-/g, '')
    }));
  }
  console.log('Tables seeded. Customer URL for Table 1:');
  console.log(`  ${process.env.APP_URL || 'http://localhost:4200'}/m/${tables[0].qrCode}`);

  const catPizza = await Category.create({ restaurantId: restaurant._id, name: 'Pizza', sortOrder: 1 });
  const catBev = await Category.create({ restaurantId: restaurant._id, name: 'Beverages', sortOrder: 2 });
  const catDessert = await Category.create({ restaurantId: restaurant._id, name: 'Desserts', sortOrder: 3 });

  const cheese = await InventoryItem.create({ restaurantId: restaurant._id, name: 'Mozzarella Cheese', unit: 'kg', currentStock: 20, lowStockThreshold: 5 });
  const flour = await InventoryItem.create({ restaurantId: restaurant._id, name: 'Pizza Flour', unit: 'kg', currentStock: 50, lowStockThreshold: 10 });

  await MenuItem.create([
    {
      restaurantId: restaurant._id, categoryId: catPizza._id, name: 'Margherita Pizza',
      description: 'Classic tomato, basil & mozzarella', price: 300, foodType: 'VEG', spicyLevel: 0, prepTimeMinutes: 20,
      variants: [{ name: 'Regular', price: 300 }, { name: 'Large', price: 450 }],
      addons: [{ name: 'Extra Cheese', price: 60 }, { name: 'Olives', price: 40 }],
      recipe: [{ inventoryItemId: cheese._id, qty: 0.15 }, { inventoryItemId: flour._id, qty: 0.25 }]
    },
    { restaurantId: restaurant._id, categoryId: catPizza._id, name: 'Peri Peri Paneer Pizza', price: 380, foodType: 'VEG', spicyLevel: 2, prepTimeMinutes: 22 },
    { restaurantId: restaurant._id, categoryId: catBev._id, name: 'Coke', price: 60, foodType: 'VEG', prepTimeMinutes: 2 },
    { restaurantId: restaurant._id, categoryId: catBev._id, name: 'Fresh Lime Soda', price: 90, foodType: 'VEG', prepTimeMinutes: 5 },
    { restaurantId: restaurant._id, categoryId: catDessert._id, name: 'Ice Cream Sundae', price: 150, foodType: 'VEG', prepTimeMinutes: 5 }
  ]);

  console.log('Seed complete.');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
