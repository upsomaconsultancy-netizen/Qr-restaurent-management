require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');

// Mock demo-request leads so the Super Admin "Demo Requests" panel isn't empty
// during development / demos. Safe to re-run: clears prior seeded mock leads first.
const MOCK = [
  { name: 'Rohan Mehta', phone: '9876543210', email: 'rohan@spicevillage.in', address: 'Spice Village, MG Road, Indore, MP', message: 'Interested in QR ordering for 3 outlets.', status: 'NEW' },
  { name: 'Ananya Sharma', phone: '9123456780', email: 'ananya@thecafehouse.com', address: 'The Cafe House, Sector 17, Chandigarh', message: 'Want to see kitchen display + billing demo.', status: 'CONTACTED' },
  { name: 'Imran Khan', phone: '9001122334', email: null, address: 'Tandoori Nights, Banjara Hills, Hyderabad', message: 'Need multi-outlet analytics.', status: 'NEW' },
  { name: 'Priya Nair', phone: '8800554477', email: 'priya@coastalbites.in', address: 'Coastal Bites, Marine Drive, Kochi, Kerala', message: 'How does table QR work for dine-in?', status: 'CONVERTED' },
  { name: 'Vikram Singh', phone: '7700998811', email: 'vikram@dhabaexpress.in', address: 'Dhaba Express, NH-48, Jaipur, Rajasthan', message: null, status: 'NEW' }
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Lead.deleteMany({ source: 'mock_seed' });
  await Lead.insertMany(MOCK.map((m) => ({ ...m, source: 'mock_seed' })));
  console.log(`✅ Seeded ${MOCK.length} mock demo-request leads`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
