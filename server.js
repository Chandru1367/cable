const path = require('path');
const os = require('os');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from project folder (index.html, app.js, styles.css)
app.use(express.static(path.join(__dirname)));

// Simple API endpoint to verify backend is running
app.get('/api/status', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), message: 'Server running' });
});

// ----- Simple JSON-file persistence for customers & payments -----
const fs = require('fs');
const DATA_FILE = path.join(__dirname, 'data.json');

function readDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = { customers: [], payments: [], expenses: [], invoices: [], nextCustomerId: 1, nextInvoiceId: 1 };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Failed to read data file', err);
    return { customers: [], payments: [], expenses: [], invoices: [], nextCustomerId: 1, nextInvoiceId: 1 };
  }
}

function writeDataFile(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write data file', err);
  }
}

// GET customers
app.get('/api/customers', (req, res) => {
  const data = readDataFile();
  res.json(data.customers || []);
});

// POST customer
app.post('/api/customers', (req, res) => {
  const payload = req.body || {};
  if (!payload.name) return res.status(400).json({ error: 'Missing name' });
  const data = readDataFile();
  const id = `CUST${String(data.nextCustomerId).padStart(6, '0')}`;
  data.nextCustomerId = (data.nextCustomerId || 1) + 1;
  const customer = { id, ...payload, createdAt: new Date().toISOString() };
  data.customers = data.customers || [];
  data.customers.push(customer);
  writeDataFile(data);
  res.status(201).json({ ok: true, customer });
});

// GET payments
app.get('/api/payments', (req, res) => {
  const data = readDataFile();
  res.json(data.payments || []);
});

// POST payment (persist)
app.post('/api/payments', (req, res) => {
  const payload = req.body || {};
  if (!payload.customerId || typeof payload.amount !== 'number') {
    return res.status(400).json({ error: 'Missing customerId or amount (number expected)' });
  }
  const data = readDataFile();
  const payment = {
    id: `PAY${Date.now()}`,
    ...payload,
    createdAt: new Date().toISOString()
  };
  data.payments = data.payments || [];
  data.payments.push(payment);
  writeDataFile(data);
  res.status(201).json({ ok: true, payment });
});

// Fallback for unknown API routes (match any path under /api)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Print helpful network info and listen on all interfaces so other devices can connect
function getLocalIPv4Addresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  const addresses = getLocalIPv4Addresses();
  if (addresses.length) {
    console.log('Accessible on your local network at:');
    addresses.forEach(addr => console.log(`  http://${addr}:${PORT}/`));
  } else {
    console.log('No non-internal IPv4 addresses found. Try http://localhost:%s/', PORT);
  }
  console.log('If you want access from other networks, set up router port-forwarding or use a tunnel (ngrok).');
});
