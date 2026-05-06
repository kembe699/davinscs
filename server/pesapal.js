import pool from './db.js';

const PESAPAL_URL = 'https://pay.pesapal.com/v3';

let _cachedToken = null;
let _tokenExpiry = null;

export async function getToken() {
  if (_cachedToken && _tokenExpiry && _tokenExpiry > Date.now() + 30000) {
    return _cachedToken;
  }
  
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error('PesaPal credentials missing. Please set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.');
  }

  const response = await fetch(`${PESAPAL_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret })
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get PesaPal token: ${err}`);
  }
  
  const data = await response.json();
  if (data.status !== '200') {
    throw new Error(`PesaPal token error: ${data.message}`);
  }

  _cachedToken = data.token;
  // Token usually expires in 5 minutes
  _tokenExpiry = new Date(data.expiryDate).getTime();
  return _cachedToken;
}

export async function registerIPN(ipnUrl) {
  const token = await getToken();
  
  const response = await fetch(`${PESAPAL_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to register IPN: ${err}`);
  }
  
  const data = await response.json();
  if (data.status !== '200') {
     throw new Error(`PesaPal IPN registration error: ${data.message || JSON.stringify(data)}`);
  }
  const ipnId = data.ipn_id;
  
  // Cache in DB settings
  await pool.query(
    `INSERT INTO public.saas_settings (key, value) VALUES ('PESAPAL_IPN_ID', $1) 
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [ipnId]
  );
  return ipnId;
}

export async function getIpnId() {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID;
  
  try {
    const { rows } = await pool.query(`SELECT value FROM public.saas_settings WHERE key = 'PESAPAL_IPN_ID'`);
    if (rows.length > 0) return rows[0].value;
  } catch (err) {
    console.error('Error fetching IPN ID from DB:', err);
  }
  return null;
}

export async function submitOrder(params) {
  // params: { id, amount, currency, description, billing_address: { email_address, phone_number, first_name, last_name }, callback_url }
  const token = await getToken();
  const ipnId = await getIpnId();
  if (!ipnId) throw new Error('IPN not registered. Please ensure PESAPAL_IPN_ID is set or IPN is registered on boot.');

  const payload = {
    id: params.id,
    currency: params.currency || 'UGX',
    amount: params.amount,
    description: params.description,
    callback_url: params.callback_url,
    notification_id: ipnId,
    billing_address: params.billing_address || { email_address: 'support@flippedpos.com' }
  };

  const response = await fetch(`${PESAPAL_URL}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to submit order: ${err}`);
  }

  const data = await response.json();
  if (data.status !== '200') {
    throw new Error(`PesaPal submit order error: ${data.message || JSON.stringify(data.error)}`);
  }

  return {
    redirect_url: data.redirect_url,
    order_tracking_id: data.order_tracking_id,
    merchant_reference: data.merchant_reference
  };
}

export async function getTransactionStatus(trackingId) {
  const token = await getToken();
  
  const response = await fetch(`${PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get transaction status: ${err}`);
  }

  const data = await response.json();
  return data;
}
