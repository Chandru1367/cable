const path = require('path');
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

// Example POST endpoint to accept a payment (demo only, stores nothing)
app.post('/api/payments', (req, res) => {
  const payload = req.body || {};
  // Basic validation
  if (!payload.customerId || typeof payload.amount !== 'number') {
    return res.status(400).json({ error: 'Missing customerId or amount (number expected)' });
  }

  // Echo back with an id and timestamp (in a real app you'd persist this)
  const saved = {
    id: `demo_${Date.now()}`,
    customerId: payload.customerId,
    amount: payload.amount,
    method: payload.method || 'cash',
    date: payload.date || new Date().toISOString()
  };

  res.status(201).json({ ok: true, payment: saved });
});

// Fallback for unknown API routes (match any path under /api)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
