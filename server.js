const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = 'b5fbf6bfb4dd1081c1e565ee38255ee5f89c0111';

app.post('/airtime', async (req, res) => {
  try {
    const response = await axios.post(
      'https://gladtidingsdata.com/api/topup/',
      req.body,
      { headers: { 'Authorization': `Token ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/data', async (req, res) => {
  try {
    const response = await axios.post(
      'https://gladtidingsdata.com/api/data/',
      req.body,
      { headers: { 'Authorization': `Token ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'PayNest Backend Running!' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
