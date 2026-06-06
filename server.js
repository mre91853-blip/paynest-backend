const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = 'b5fbf6bfb4dd1081c1e565ee38255ee5f89c0111';

app.post('/airtime', async (req, res) => {
  try {
    const { network, amount, mobile_number } = req.body;
    const payload = {
      network: network,
      amount: parseInt(amount),
      mobile_number: mobile_number,
      Ported_number: true,
      airtime_type: 'VTU'
    };
    console.log('Airtime payload:', payload);
    const response = await axios.post(
      'https://gladtidingsdata.com/api/topup/',
      payload,
      {
        headers: {
          'Authorization': `Token ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Airtime response:', response.data);
    const data = response.data;
    if (data.Status === 'successful') {
      res.json({ success: true, message: 'Airtime purchased successfully!' });
    } else {
      res.status(400).json({
        success: false,
        message: data.api_response || data.message || 'Transaction failed'
      });
    }
  } catch (e) {
    console.error('Airtime error:', e.response?.data);
    const errData = e.response?.data;
    res.status(400).json({
      success: false,
      message: errData?.api_response || errData?.message || e.message || 'Airtime purchase failed'
    });
  }
});

app.post('/data', async (req, res) => {
  try {
    const { network, mobile_number, plan } = req.body;
    const payload = {
      network: network,
      mobile_number: mobile_number,
      plan: plan,
      Ported_number: true
    };
    console.log('Data payload:', payload);
    const response = await axios.post(
      'https://gladtidingsdata.com/api/data/',
      payload,
      {
        headers: {
          'Authorization': `Token ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Data response:', response.data);
    const data = response.data;
    if (data.Status === 'successful') {
      res.json({ success: true, message: 'Data purchased successfully!' });
    } else {
      res.status(400).json({
        success: false,
        message: data.api_response || data.message || 'Transaction failed'
      });
    }
  } catch (e) {
    console.error('Data error:', e.response?.data);
    const errData = e.response?.data;
    res.status(400).json({
      success: false,
      message: errData?.api_response || errData?.message || e.message || 'Data purchase failed'
    });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'PayNest Backend Running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
