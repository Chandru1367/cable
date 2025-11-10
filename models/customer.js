const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  phone: { type: String },
  stbNumber: { type: String },
  amount: { type: Number, default: 0 },
  renewDate: { type: String },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
