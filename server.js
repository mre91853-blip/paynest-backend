const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ── API Tokens ─────────────────────────────────────────────────────
const TOKEN = 'b5fbf6bfb4dd1081c1e565ee38255'; // your gladtidingsdata token

// ── Supabase ────────────────────────────────────────────────────────
// Replace these with your actual Supabase URL and service role key
const SUPABASE_URL = 'https://ixlahevmdwdoqibzmece.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bGFoZXZtZHdkb3FpYnptZWNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NzEyMiwiZXhwIjoyMDk2MjIzMTIyfQ.AeTqveTiRSo2Y02rhWeonilGuWspH6DCcv1cgxIhaqc';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── AIRTIME ─────────────────────────────────────────────────────────
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
      res.json({ success: true, message: 'Airtime purchased successfully' });
    } else {
      res.status(400).json({
        success: false,
        message: data.api_response || data.message || 'Airtime purchase failed'
      });
    }
  } catch (e) {
    console.error('Airtime error:', e.response?.data);
    const errData = e.response?.data;
    res.status(400).json({
      success: false,
      message: errData?.api_response || errData?.message || 'Airtime purchase failed'
    });
  }
});

// ── DATA ────────────────────────────────────────────────────────────
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
      res.json({ success: true, message: 'Data purchased successfully' });
    } else {
      res.status(400).json({
        success: false,
        message: data.api_response || data.message || 'Data purchase failed'
      });
    }
  } catch (e) {
    console.error('Data error:', e.response?.data);
    const errData = e.response?.data;
    res.status(400).json({
      success: false,
      message: errData?.api_response || errData?.message || 'Data purchase failed'
    });
  }
});

// ── LOOKUP ACCOUNT ──────────────────────────────────────────────────
// Verify a PayNest account number before sending money
app.post('/lookup-account', async (req, res) => {
  try {
    const { account_number } = req.body;

    if (!account_number) {
      return res.status(400).json({ found: false, message: 'Account number is required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, bank_name')
      .eq('account_number', account_number)
      .single();

    if (error || !data) {
      return res.json({ found: false, message: 'Account not found on PayNest' });
    }

    res.json({
      found: true,
      name: data.full_name,
      bank: data.bank_name || 'PayNest'
    });

  } catch (e) {
    console.error('Lookup error:', e);
    res.status(500).json({ found: false, message: 'Server error' });
  }
});

// ── TRANSFER MONEY ──────────────────────────────────────────────────
app.post('/transfer', async (req, res) => {
  try {
    const { sender_id, receiver_account, amount, pin, note } = req.body;

    // Validate inputs
    if (!sender_id || !receiver_account || !amount || !pin) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // 1. Verify sender PIN
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('id, full_name, email, wallet_balance, transaction_pin')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      return res.status(400).json({ success: false, message: 'Sender account not found' });
    }

    if (sender.transaction_pin !== pin) {
      return res.status(400).json({ success: false, message: 'Incorrect transaction PIN' });
    }

    // 2. Check balance
    if (parseFloat(sender.wallet_balance) < transferAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // 3. Find receiver
    const { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('id, full_name, email, wallet_balance')
      .eq('account_number', receiver_account)
      .single();

    if (receiverError || !receiver) {
      return res.status(400).json({ success: false, message: 'Recipient account not found on PayNest' });
    }

    // 4. Prevent self-transfer
    if (receiver.id === sender_id) {
      return res.status(400).json({ success: false, message: 'You cannot send money to yourself' });
    }

    // 5. Debit sender
    const newSenderBalance = parseFloat(sender.wallet_balance) - transferAmount;
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newSenderBalance })
      .eq('id', sender_id);

    if (debitError) {
      return res.status(500).json({ success: false, message: 'Transfer failed. Try again.' });
    }

    // 6. Credit receiver
    const newReceiverBalance = parseFloat(receiver.wallet_balance) + transferAmount;
    await supabase
      .from('profiles')
      .update({ wallet_balance: newReceiverBalance })
      .eq('id', receiver.id);

    // 7. Record transaction
    const reference = 'TXN' + Date.now() + Math.floor(Math.random() * 9999);
    await supabase.from('transactions').insert({
      sender_id: sender_id,
      receiver_id: receiver.id,
      sender_email: sender.email,
      receiver_email: receiver.email,
      receiver_account_number: receiver_account,
      receiver_bank: 'PayNest',
      receiver_name: receiver.full_name,
      amount: transferAmount,
      type: 'transfer',
      status: 'success',
      reference: reference,
      note: note || null
    });

    console.log(`Transfer: ${sender.email} -> ${receiver.full_name} | ₦${transferAmount} | Ref: ${reference}`);

    res.json({
      success: true,
      message: 'Transfer successful',
      reference: reference,
      receiver_name: receiver.full_name,
      amount: transferAmount,
      new_balance: newSenderBalance
    });

  } catch (e) {
    console.error('Transfer error:', e);
    res.status(500).json({ success: false, message: 'Transfer failed. Please try again.' });
  }
});

// ── HEALTH CHECK ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'PayNest Backend Running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
