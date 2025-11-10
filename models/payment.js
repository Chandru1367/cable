const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  id: { type: String },
  customerId: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'cash' },
  date: { type: String },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
