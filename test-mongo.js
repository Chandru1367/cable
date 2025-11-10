// Simple mongoose connection test script
const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Set it in .env or environment and rerun.');
  process.exit(1);
}

console.log('Trying to connect to MongoDB...');

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Mongoose connected successfully.');
    return mongoose.connection.close();
  })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Mongoose connection error:');
    console.error(err);
    process.exit(2);
  });
