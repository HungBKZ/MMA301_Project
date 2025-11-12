// Minimal VNPay backend for generating payment URL and handling return/IPN
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dayjs = require('dayjs');
const qs = require('qs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from multiple likely locations to avoid CWD issues.
// We load all of them in sequence without override so any missing keys get filled.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Configuration: set via environment or replace defaults for sandbox
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; // Exposed URL of this server

const VNP_TMN_CODE = (process.env.VNP_TMN_CODE || 'R2O8DMVV').trim();
const VNP_HASH_SECRET = (process.env.VNP_HASH_SECRET || '9IQAKIAYAX2H1HCW1Y9HD7FL75OD208K').trim();
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || `${BASE_URL}/payment/vnpay/return`;
const VNP_SANDBOX_PAY_URL = process.env.VNP_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
// Follow VNPay spec strictly: percent-encode with encodeURIComponent (space -> %20),
// sign over encoded values, and produce lowercase hex HMAC.

function hmacSHA512(secret, data) {
    const hex = crypto.createHmac('sha512', secret).update(data, 'utf-8').digest('hex');
    return hex; // always lowercase as per spec
}

// VNPay signing per common Node.js sample: sort keys; sign string built WITHOUT url-encoding; build URL with encoding
function sortAndEncodeParams(input) {
    const encoded = {};
    Object.keys(input)
        .filter((k) => !['vnp_SecureHash', 'vnp_SecureHashType'].includes(k))
        .sort()
        .forEach((k) => {
            const val = String(input[k]);
            // Encode using encodeURIComponent (space -> %20). Do NOT replace with '+'
            let enc = encodeURIComponent(val);
            // VNPay historical samples expect space as '+'. Allow toggling via env.
            // When VNP_SPACE_PLUS=1, replace '%20' with '+' after encoding.
            if (process.env.VNP_SPACE_PLUS === '1') {
                enc = enc.replace(/%20/g, '+');
            }
            encoded[k] = enc;
        });
    return encoded;
}

function sortRawParams(input) {
    const raw = {};
    Object.keys(input)
        .filter((k) => !['vnp_SecureHash', 'vnp_SecureHashType'].includes(k))
        .sort()
        .forEach((k) => {
            raw[k] = String(input[k]);
        });
    return raw;
}

function buildSignatureAndQueryEncoded(input, { includeType = true } = {}) {
    const encodedSorted = sortAndEncodeParams(input);
    const signData = qs.stringify(encodedSorted, { encode: false, indices: false });
    const secureHash = hmacSHA512(VNP_HASH_SECRET, signData);
    const extra = includeType ? `&vnp_SecureHashType=HMACSHA512` : '';
    const query = `${signData}&vnp_SecureHash=${secureHash}${extra}`;
    return { query, secureHash, signData, method: 'encoded' };
}

function buildSignatureAndQueryRaw(input, { includeType = true } = {}) {
    const rawSorted = sortRawParams(input);
    const signData = qs.stringify(rawSorted, { encode: false, indices: false });
    const secureHash = hmacSHA512(VNP_HASH_SECRET, signData);
    const queryBase = qs.stringify(rawSorted, { encode: true, indices: false });
    const extra = includeType ? `&vnp_SecureHashType=HMACSHA512` : '';
    const query = `${queryBase}&vnp_SecureHash=${secureHash}${extra}`;
    return { query, secureHash, signData, method: 'raw' };
}

// Create a VNPay payment URL
// Simple in-memory store to remember which deep link to return to per txn
// In dev with Expo Go, we need to redirect to an exp:// URL, which is dynamic per device.
// The client will send returnDeeplink built via Linking.createURL('payment/vnpay-return')
// and we will use it on /payment/vnpay/return.
const txnReturnMap = new Map(); // vnp_TxnRef -> returnDeeplink

app.post('/payment/vnpay/create', (req, res) => {
    const { amount, orderId, orderInfo, bankCode, returnDeeplink, useWebView } = req.body || {};
    if (!amount && amount !== 0) return res.status(400).json({ error: 'amount is required' });
    const intAmount = Math.round(Number(amount));
    if (!Number.isFinite(intAmount) || intAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number (VND)' });
    }
    if (intAmount < 2000) {
        return res.status(400).json({ error: 'minimum amount for VNPay sandbox is typically >= 2,000 VND' });
    }

    const now = dayjs();
    // Use unique vnp_TxnRef per attempt to avoid code=71 when amount changes for same orderId
    const baseRef = orderId ? String(orderId) : `ORDER_${now.format('YYYYMMDDHHmmss')}`;
    const vnp_TxnRef = orderId ? `${baseRef}-${now.format('YYYYMMDDHHmmss')}` : baseRef;
    const vnp_Amount = intAmount * 100;
    const vnp_CreateDate = now.format('YYYYMMDDHHmmss');
    const vnp_ExpireDate = now.add(15, 'minute').format('YYYYMMDDHHmmss');

    const vnp_IpAddr = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

    // Choose return URL per flow: normal deep link bridge vs WebView bridge
    const requestReturnUrl = (useWebView ? `${BASE_URL}/payment/vnpay/return-webview` : VNP_RETURN_URL);

    const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNP_TMN_CODE,
        vnp_Amount,
        vnp_CurrCode: 'VND',
        vnp_TxnRef,
        vnp_OrderInfo: orderInfo || `Thanh toan don hang ${vnp_TxnRef}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: requestReturnUrl,
        vnp_IpAddr,
        vnp_CreateDate,
        vnp_ExpireDate,
    };

    if (bankCode) vnpParams['vnp_BankCode'] = bankCode;

    // Always use encoded-value signing per VNPay spec
    const built = buildSignatureAndQueryEncoded(vnpParams, { includeType: true });
    if (process.env.DEBUG_VNPAY === '1') {
        console.log(`[VNPay] method=${built.method} signData:`, built.signData);
    }
    const payUrl = `${VNP_SANDBOX_PAY_URL}?${built.query}`;

    // Remember where to deep-link back on return (use txnRef key since VNPay returns it)
    if (typeof returnDeeplink === 'string' && returnDeeplink.length > 0) {
        txnReturnMap.set(vnp_TxnRef, returnDeeplink);
        // Also keep minimal TTL by scheduling cleanup in ~30 minutes
        setTimeout(() => txnReturnMap.delete(vnp_TxnRef), 30 * 60 * 1000).unref?.();
    }

    res.json({ orderId: baseRef, txnRef: vnp_TxnRef, amount: intAmount, payUrl });
});

// Debug endpoint: returns the exact parameters, signData and secure hash used for VNPay
// WARNING: For development only. Do not expose in production.
app.post('/payment/vnpay/debug', (req, res) => {
    const { amount, orderId, orderInfo, bankCode } = req.body || {};
    if (!amount && amount !== 0) return res.status(400).json({ error: 'amount is required' });
    const intAmount = Math.round(Number(amount));
    if (!Number.isFinite(intAmount) || intAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number (VND)' });
    }

    const now = dayjs();
    const baseRef = orderId ? String(orderId) : `ORDER_${now.format('YYYYMMDDHHmmss')}`;
    const vnp_TxnRef = orderId ? `${baseRef}-${now.format('YYYYMMDDHHmmss')}` : baseRef;
    const vnp_Amount = intAmount * 100;
    const vnp_CreateDate = now.format('YYYYMMDDHHmmss');
    const vnp_ExpireDate = now.add(15, 'minute').format('YYYYMMDDHHmmss');

    const vnp_IpAddr = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

    const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNP_TMN_CODE,
        vnp_Amount,
        vnp_CurrCode: 'VND',
        vnp_TxnRef,
        vnp_OrderInfo: orderInfo || `Thanh toan don hang ${vnp_TxnRef}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: VNP_RETURN_URL,
        vnp_IpAddr,
        vnp_CreateDate,
        vnp_ExpireDate,
    };

    if (bankCode) vnpParams['vnp_BankCode'] = bankCode;

    const encBuilt = buildSignatureAndQueryEncoded(vnpParams, { includeType: true });
    const rawBuilt = buildSignatureAndQueryRaw(vnpParams, { includeType: true });
    const payUrl = `${VNP_SANDBOX_PAY_URL}?${encBuilt.query}`;

    res.json({
        debug: true,
        methodConfigured: 'encoded',
        encoded: { signData: encBuilt.signData, secureHash: encBuilt.secureHash, query: encBuilt.query },
        raw: { signData: rawBuilt.signData, secureHash: rawBuilt.secureHash, query: rawBuilt.query },
        payUrl,
        effective: {
            VNP_TMN_CODE,
            VNP_RETURN_URL,
        },
        txnRef: vnp_TxnRef,
    });
});

// VNPay return URL (browser redirects the user here). We then deep-link into the app.
app.get('/payment/vnpay/return', (req, res) => {
    const params = req.query;
    const secureHash = params['vnp_SecureHash'];
    const encBuilt = buildSignatureAndQueryEncoded(params, { includeType: false });
    // Validate strictly against encoded variant only
    const isValid = !!secureHash && secureHash.toLowerCase() === encBuilt.secureHash.toLowerCase();
    const success = params['vnp_ResponseCode'] === '00' && isValid;

    const txnRef = params['vnp_TxnRef'] || '';
    // If client supplied a concrete returnDeeplink (e.g., exp://.../--/payment/vnpay-return), prefer it
    const remembered = txnReturnMap.get(txnRef);
    let deeplinkBase = remembered;
    if (!deeplinkBase) {
        // Fallback to custom scheme for standalone/dev-client builds
        const scheme = process.env.APP_SCHEME || 'movieapp';
        deeplinkBase = `${scheme}://payment/vnpay-return`;
    }
    // Append query params properly
    const sep = deeplinkBase.includes('?') ? '&' : '?';
    const deeplink = `${deeplinkBase}${sep}orderId=${encodeURIComponent(txnRef)}&success=${success ? '1' : '0'}&code=${encodeURIComponent(params['vnp_ResponseCode'] || '')}`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
  <html><head><meta charset="utf-8"><title>VNPay Return</title></head>
  <body>
    <p>Đang chuyển về ứng dụng…</p>
    <script>window.location.href='${deeplink}';</script>
  </body></html>`);
});

// VNPay return for WebView flow: postMessage back to RN instead of deep-linking
app.get('/payment/vnpay/return-webview', (req, res) => {
        const params = req.query;
        const secureHash = params['vnp_SecureHash'];
        const encBuilt = buildSignatureAndQueryEncoded(params, { includeType: false });
        const isValid = !!secureHash && secureHash.toLowerCase() === encBuilt.secureHash.toLowerCase();
        const success = params['vnp_ResponseCode'] === '00' && isValid;
        const txnRef = params['vnp_TxnRef'] || '';

        const payload = {
                success: success ? 1 : 0,
                code: params['vnp_ResponseCode'] || '',
                txnRef,
                orderId: (typeof txnRef === 'string' ? txnRef.split('-')[0] : ''),
        };

        const json = JSON.stringify(payload).replace(/</g, '\u003c');

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!doctype html>
    <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>VNPay Return</title>
            <style>body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding:16px;}</style>
        </head>
        <body>
            <h3>${success ? 'Thanh toán thành công' : 'Thanh toán thất bại'}</h3>
            <p>Mã: ${payload.code || 'N/A'} — Tham chiếu: ${payload.txnRef || 'N/A'}</p>
            <script>
                try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage('${json}'); } catch (e) {}
            </script>
            <noscript>Đóng cửa sổ này để quay lại ứng dụng.</noscript>
        </body>
    </html>`);
});

// Optional: IPN handler (server-to-server)
app.get('/payment/vnpay/ipn', (req, res) => {
    const params = req.query;
    const secureHash = params['vnp_SecureHash'];
    const encBuilt = buildSignatureAndQueryEncoded(params, { includeType: false });
    const isValid = !!secureHash && secureHash.toLowerCase() === encBuilt.secureHash.toLowerCase();
    if (!isValid) return res.json({ RspCode: '97', Message: 'Invalid signature' });

    // TODO: Update order status in your database according to vnp_TxnRef & vnp_ResponseCode
    return res.json({ RspCode: '00', Message: 'Confirm Success' });
});

app.get('/', (_req, res) => {
    res.json({ ok: true, name: 'MMA301 VNPay server', returnUrl: VNP_RETURN_URL });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`VNPay server listening on 0.0.0.0:${PORT}`);
    console.log(`Configured BASE_URL: ${BASE_URL}`);
    // Log effective (non-sensitive) VNPay config
    const maskedSecret = VNP_HASH_SECRET ? VNP_HASH_SECRET.slice(0, 4) + '***' + VNP_HASH_SECRET.slice(-4) : 'N/A';
    console.log(`[VNPay] TMN_CODE=${VNP_TMN_CODE}, RETURN_URL=${VNP_RETURN_URL}, SECRET=${maskedSecret}`);
    // Log reachable LAN addresses
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((name) => {
        for (const entry of ifaces[name] || []) {
            if (entry.family === 'IPv4' && !entry.internal) {
                console.log(`- Try: http://${entry.address}:${PORT}/`);
            }
        }
    });
});
