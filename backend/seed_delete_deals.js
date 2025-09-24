const mongoose = require('mongoose');
const Deal = require('./models/Deal');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const result = await Deal.deleteMany({});
    console.log(`Deleted ${result.deletedCount} deals from the database.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Error during deletion:', err);
    process.exit(1);
  }
}

run();
