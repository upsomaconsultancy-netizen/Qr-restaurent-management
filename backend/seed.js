/**
 * Seed script: creates a Super Admin, one demo restaurant with owner/staff,
 * 2 outlets, 5 tables with QR tokens, categories, menu items and inventory.
 *
 * Run from backend/:  npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const base = './src/models/';
const Restaurant = require(base + 'Restaurant');
const Outlet = require(base + 'Outlet');
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
    plan: 'STANDARD', tableLimit: 20, taxPercent: 5
  });

  // Create 2 outlets
  const outlet1 = await Outlet.create({
    restaurantId: restaurant._id,
    name: 'Connaught Place Branch',
    address: 'Block D, Connaught Place, New Delhi',
    phone: '+91 98765 43210',
    email: 'cp@spicegarden.com',
    status: 'ACTIVE'
  });
  const outlet2 = await Outlet.create({
    restaurantId: restaurant._id,
    name: 'Saket Branch',
    address: 'Select City Walk, Saket, New Delhi',
    phone: '+91 98765 43211',
    email: 'saket@spicegarden.com',
    status: 'ACTIVE'
  });
  console.log(`Outlet 1: ${outlet1.name} (${outlet1._id})`);
  console.log(`Outlet 2: ${outlet2.name} (${outlet2._id})`);

  // Staff — OWNER/MANAGER get no outletId, WAITER/KITCHEN assigned to outlet1
  const mk = async (name, email, role, pwd, outletId = null) => {
    const u = new User({ restaurantId: restaurant._id, outletId, name, email, role });
    await u.setPassword(pwd);
    await u.save();
    console.log(`${role}: ${email} / ${pwd}${outletId ? ` (outlet: ${outletId})` : ''}`);
    return u;
  };
  await mk('Ravi Owner', 'owner@spicegarden.com', 'OWNER', 'Owner@1234');
  await mk('Meera Manager', 'manager@spicegarden.com', 'MANAGER', 'Manager@1234');
  await mk('Arjun Waiter', 'waiter@spicegarden.com', 'WAITER', 'Waiter@1234', outlet1._id);
  await mk('Kitchen One', 'kitchen@spicegarden.com', 'KITCHEN', 'Kitchen@1234', outlet1._id);
  // Second outlet staff
  await mk('Priya Waiter', 'waiter2@spicegarden.com', 'WAITER', 'Waiter@1234', outlet2._id);
  await mk('Kitchen Two', 'kitchen2@spicegarden.com', 'KITCHEN', 'Kitchen@1234', outlet2._id);

  // Tables for outlet 1 (3 tables)
  const tables1 = [];
  for (let n = 1; n <= 3; n++) {
    tables1.push(await Table.create({
      restaurantId: restaurant._id, outletId: outlet1._id,
      number: n, name: `T-${n}`, capacity: 4,
      qrCode: uuid().replace(/-/g, '')
    }));
  }

  // Tables for outlet 2 (2 tables)
  const tables2 = [];
  for (let n = 1; n <= 2; n++) {
    tables2.push(await Table.create({
      restaurantId: restaurant._id, outletId: outlet2._id,
      number: n, name: `T-${n}`, capacity: 4,
      qrCode: uuid().replace(/-/g, '')
    }));
  }

  const appUrl = process.env.APP_URL || 'http://localhost:4200';
  console.log('\nOutlet 1 - Customer URL for Table 1:');
  console.log(`  ${appUrl}/m/${tables1[0].qrCode}`);
  console.log('Outlet 2 - Customer URL for Table 1:');
  console.log(`  ${appUrl}/m/${tables2[0].qrCode}`);

  // Categories + Menu for outlet 1
  const catPizza1 = await Category.create({ restaurantId: restaurant._id, outletId: outlet1._id, name: 'Pizza', sortOrder: 1 });
  const catBev1 = await Category.create({ restaurantId: restaurant._id, outletId: outlet1._id, name: 'Beverages', sortOrder: 2 });
  const catDessert1 = await Category.create({ restaurantId: restaurant._id, outletId: outlet1._id, name: 'Desserts', sortOrder: 3 });

  // Categories + Menu for outlet 2
  const catBiryani2 = await Category.create({ restaurantId: restaurant._id, outletId: outlet2._id, name: 'Biryani', sortOrder: 1 });
  const catBev2 = await Category.create({ restaurantId: restaurant._id, outletId: outlet2._id, name: 'Beverages', sortOrder: 2 });

  // Inventory for outlet 1
  const cheese1 = await InventoryItem.create({ restaurantId: restaurant._id, outletId: outlet1._id, name: 'Mozzarella Cheese', unit: 'kg', currentStock: 20, lowStockThreshold: 5 });
  const flour1 = await InventoryItem.create({ restaurantId: restaurant._id, outletId: outlet1._id, name: 'Pizza Flour', unit: 'kg', currentStock: 50, lowStockThreshold: 10 });

  // Inventory for outlet 2
  await InventoryItem.create({ restaurantId: restaurant._id, outletId: outlet2._id, name: 'Basmati Rice', unit: 'kg', currentStock: 30, lowStockThreshold: 5 });

  // Menu items for outlet 1
  await MenuItem.create([
    {
      restaurantId: restaurant._id, outletId: outlet1._id, categoryId: catPizza1._id, name: 'Margherita Pizza',
      description: 'Classic tomato, basil & mozzarella', price: 300, foodType: 'VEG', spicyLevel: 0, prepTimeMinutes: 20,
      variants: [{ name: 'Regular', price: 300 }, { name: 'Large', price: 450 }],
      addons: [{ name: 'Extra Cheese', price: 60 }, { name: 'Olives', price: 40 }],
      recipe: [{ inventoryItemId: cheese1._id, qty: 0.15 }, { inventoryItemId: flour1._id, qty: 0.25 }]
    },
    { restaurantId: restaurant._id, outletId: outlet1._id, categoryId: catPizza1._id, name: 'Peri Peri Paneer Pizza', price: 380, foodType: 'VEG', spicyLevel: 2, prepTimeMinutes: 22 },
    { restaurantId: restaurant._id, outletId: outlet1._id, categoryId: catBev1._id, name: 'Coke', price: 60, foodType: 'VEG', prepTimeMinutes: 2 },
    { restaurantId: restaurant._id, outletId: outlet1._id, categoryId: catBev1._id, name: 'Fresh Lime Soda', price: 90, foodType: 'VEG', prepTimeMinutes: 5 },
    { restaurantId: restaurant._id, outletId: outlet1._id, categoryId: catDessert1._id, name: 'Ice Cream Sundae', price: 150, foodType: 'VEG', prepTimeMinutes: 5 }
  ]);

  // Menu items for outlet 2
  await MenuItem.create([
    { restaurantId: restaurant._id, outletId: outlet2._id, categoryId: catBiryani2._id, name: 'Chicken Biryani', price: 320, foodType: 'NON_VEG', spicyLevel: 2, prepTimeMinutes: 25 },
    { restaurantId: restaurant._id, outletId: outlet2._id, categoryId: catBiryani2._id, name: 'Veg Biryani', price: 250, foodType: 'VEG', spicyLevel: 1, prepTimeMinutes: 20 },
    { restaurantId: restaurant._id, outletId: outlet2._id, categoryId: catBev2._id, name: 'Mango Lassi', price: 80, foodType: 'VEG', prepTimeMinutes: 3 }
  ]);

  console.log('\nSeed complete.');
  console.log('\nLogin credentials:');
  console.log('  Super Admin: admin@platform.com / SuperAdmin@123');
  console.log('  Owner:   owner@spicegarden.com / Owner@1234');
  console.log('  Manager: manager@spicegarden.com / Manager@1234');
  console.log('  Waiter (Outlet 1): waiter@spicegarden.com / Waiter@1234');
  console.log('  Kitchen (Outlet 1): kitchen@spicegarden.com / Kitchen@1234');
  console.log('  Waiter (Outlet 2): waiter2@spicegarden.com / Waiter@1234');
  console.log('  Kitchen (Outlet 2): kitchen2@spicegarden.com / Kitchen@1234');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
