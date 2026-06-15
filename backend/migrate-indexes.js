/**
 * One-time migration: drop stale restaurant-scoped unique indexes and let Mongoose
 * re-create the correct outlet-scoped ones on next app start.
 *
 * Run ONCE against production:
 *   node backend/migrate-indexes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // ── Orders ───────────────────────────────────────────────────────────────────
  // Drop old restaurant-scoped unique index. New index {outletId,orderNumber} is
  // created automatically by Mongoose on startup.
  try {
    await db.collection('orders').dropIndex('restaurantId_1_orderNumber_1');
    console.log('✓ Dropped orders index: restaurantId_1_orderNumber_1');
  } catch (e) {
    if (e.codeName === 'IndexNotFound') {
      console.log('– orders index restaurantId_1_orderNumber_1 not found (already dropped)');
    } else {
      console.error('✗ orders index drop failed:', e.message);
    }
  }

  // ── Tables ───────────────────────────────────────────────────────────────────
  // Old index was {restaurantId,tableNumber} without outletId. New index already
  // includes outletId so same-numbered tables in different outlets are allowed.
  try {
    await db.collection('tables').dropIndex('restaurantId_1_number_1');
    console.log('✓ Dropped tables index: restaurantId_1_number_1');
  } catch (e) {
    if (e.codeName === 'IndexNotFound') {
      console.log('– tables index restaurantId_1_number_1 not found (already dropped)');
    } else {
      console.error('✗ tables index drop failed:', e.message);
    }
  }

  // Also drop any two-field variant that may exist without outletId
  try {
    await db.collection('tables').dropIndex('restaurantId_1_outletId_1_number_1');
    console.log('✓ Dropped tables index: restaurantId_1_outletId_1_number_1 (will be recreated by Mongoose)');
  } catch (e) {
    if (e.codeName === 'IndexNotFound') {
      console.log('– tables index restaurantId_1_outletId_1_number_1 not found (will be created fresh)');
    } else {
      console.error('✗ tables index drop failed:', e.message);
    }
  }

  console.log('\nMigration complete. Restart the app — Mongoose will rebuild correct indexes on startup.');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
