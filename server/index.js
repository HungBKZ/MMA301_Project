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

// Booking view page: displays all seats and metadata encoded in BOOKING QR payload
// Format: BOOKING|code=...|id=...|movie=...|time=...|cinema=...|room=...|seats=A1,A2,B1|count=3|paid=3
app.get('/booking/view', (req, res) => {
    const text = String(req.query.text || '').trim();
    const fields = { code: '', id: '', movie: '', time: '', cinema: '', room: '', seats: '', count: '', paid: '', cinemaAddr: '' };
    if (text.startsWith('BOOKING|')) {
        Object.keys(fields).forEach(k => {
            const m = text.match(new RegExp(`(?:^|\\|)${k}=([^|]+)`));
            if (m) fields[k] = m[1];
        });
    }
    const esc = (s) => String(s).replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const seatArr = fields.seats ? fields.seats.split(/[,\s]+/).filter(Boolean) : [];
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thông tin đặt chỗ</title>
    <style>
        :root{color-scheme:light dark}
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px;margin:0;background:#f6f8fa;}
        .wrap{max-width:820px;margin:0 auto}
        .card{background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.08);padding:26px;}
        @media (prefers-color-scheme: dark){body{background:#0f1316}.card{background:#182027;box-shadow:0 6px 24px rgba(0,0,0,.55);} .muted{color:#95a2b3}}
        h1{margin:0 0 18px;font-size:24px;font-weight:700}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:20px}
        .item{background:#fafafa;border:1px solid #e2e8f0;padding:14px;border-radius:12px}
        @media (prefers-color-scheme: dark){.item{background:#1f2730;border-color:#2d3a47}}
        .label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;color:#596273}
        .value{margin:0;font-size:15px;word-break:break-word}
        .seats{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
        .seat{background:#2563eb;color:#fff;padding:6px 10px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,.18)}
        @media (prefers-color-scheme: dark){.seat{background:#3b82f6}}
        .muted{font-size:13px;color:#666;margin-top:28px;line-height:1.5}
        footer{margin-top:34px;font-size:11px;color:#888;text-align:center}
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <h1>Thông tin đặt chỗ</h1>
            ${!text ? '<p class="muted">Không có dữ liệu đặt chỗ. Vui lòng quét lại.</p>' : ''}
            <div class="grid">
                ${fields.movie ? `<div class="item"><p class="label">Phim</p><p class="value">${esc(fields.movie)}</p></div>` : ''}
                ${fields.time ? `<div class="item"><p class="label">Suất chiếu</p><p class="value">${esc(fields.time)}</p></div>` : ''}
                ${fields.cinema ? `<div class="item"><p class="label">Rạp</p><p class="value">${esc(fields.cinema)}</p></div>` : ''}
                ${fields.room ? `<div class="item"><p class="label">Phòng</p><p class="value">${esc(fields.room)}</p></div>` : ''}
            </div>
            <div class="item" style="margin-top:4px">
                <p class="label">Danh sách ghế</p>
                ${seatArr.length ? `<div class="seats">${seatArr.map(s => `<span class="seat">${esc(s)}</span>`).join('')}</div>` : `<p class="value" style="font-style:italic;color:#666">Không có ghế</p>`}
            </div>
            <p class="muted">Trang này hiển thị thông tin được mã hoá trong QR. Để kiểm tra trạng thái thực tế (ví dụ ghế bị huỷ), hãy mở ứng dụng chính.</p>
            <footer>© ${new Date().getFullYear()} MMA301 MovieApp</footer>
        </div>
    </div>
</body>
</html>`);
});

// Simple ticket view page so external QR scanners can open a human-readable page.
// Supports two forms:
// 1) /ticket/view?text=TICKET|code=...|id=...|seat=...|movie=...|time=...
// 2) /ticket/:code -> shows the code only (fallback if only code is available)
app.get('/ticket/view', (req, res) => {
    const text = String(req.query.text || '').trim();
    // Parse pipe-delimited ticket payload produced by the mobile app.
    // Format now supports: code,id,seat,movie,time,cinema,cinemaAddr,room,price,status
    const fields = {
        code: '', id: '', seat: '', movie: '', time: '', cinema: '', cinemaAddr: '', room: '', price: '', status: ''
    };
    if (text.startsWith('TICKET|')) {
        Object.keys(fields).forEach(k => {
            const m = text.match(new RegExp(`(?:^|\\|)${k}=([^|]+)`));
            if (m) fields[k] = m[1];
        });
    }
    // Basic formatting helpers
    const esc = (s) => String(s).replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const priceFormatted = fields.price ? (() => {
        const n = Number(fields.price);
        return Number.isFinite(n) ? n.toLocaleString('vi-VN') + 'đ' : esc(fields.price);
    })() : '';

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thông tin vé</title>
  <style>
    :root{color-scheme:light dark}
    body{font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:16px; background:#f5f7fa;}
    .card{max-width:680px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.08);padding:22px;}
    @media (prefers-color-scheme: dark){body{background:#0e1114} .card{background:#1b1f24; box-shadow:0 4px 18px rgba(0,0,0,.45);} .p{color:#eee} .muted{color:#999}}
    h1{font-size:22px;font-weight:700;margin:0 0 14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:4px}
    .item{background:#fafafa;border:1px solid #e2e8f0;padding:12px;border-radius:10px}
    @media (prefers-color-scheme: dark){.item{background:#222a33;border-color:#2e3a46}}
    .label{font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:600;color:#555;margin:0 0 6px}
    .value{margin:0;font-size:15px;word-break:break-word}
    .code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:14px}
    .muted{color:#666;font-size:13px;margin-top:18px}
    footer{margin-top:28px;font-size:11px;color:#888;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <h1>Thông tin vé</h1>
    ${!text ? '<p class="muted">Không có dữ liệu vé. Vui lòng quét lại từ ứng dụng.</p>' : ''}
    <div class="grid">
    ${fields.movie ? `<div class="item"><p class="label">Phim</p><p class="value">${esc(fields.movie)}</p></div>` : ''}
    ${fields.time ? `<div class="item"><p class="label">Suất chiếu</p><p class="value">${esc(fields.time)}</p></div>` : ''}
    ${fields.cinema ? `<div class="item"><p class="label">Rạp</p><p class="value">${esc(fields.cinema)}${fields.cinemaAddr ? '<br/><small>' + esc(fields.cinemaAddr) + '</small>' : ''}</p></div>` : ''}
    ${fields.room ? `<div class="item"><p class="label">Phòng</p><p class="value">${esc(fields.room)}</p></div>` : ''}
    ${fields.seat ? `<div class="item"><p class="label">Ghế</p><p class="value">${esc(fields.seat)}</p></div>` : ''}
      ${priceFormatted ? `<div class="item"><p class="label">Giá</p><p class="value">${priceFormatted}</p></div>` : ''}
    ${fields.status ? `<div class="item"><p class="label">Trạng thái</p><p class="value">${esc(fields.status)}</p></div>` : ''}
    ${fields.id ? `<div class="item"><p class="label">ID Vé</p><p class="value code">${esc(fields.id)}</p></div>` : ''}
    ${fields.code ? `<div class="item"><p class="label">Mã QR</p><p class="value code">${esc(fields.code)}</p></div>` : ''}
    </div>
    <p class="muted">Trang web này hiển thị thông tin đã mã hóa trong QR. Để kiểm tra tính hợp lệ / cập nhật trạng thái mới nhất, hãy mở vé trong ứng dụng.</p>
    <footer>© ${new Date().getFullYear()} MMA301 MovieApp</footer>
  </div>
</body>
</html>`);
});

app.get('/ticket/:code', (req, res) => {
    const code = String(req.params.code || '');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mã vé</title>
<style>body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding:16px;} .card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.08);padding:16px} .code{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;}</style>
</head>
<body>
    <div class="card">
        <h2>Mã vé</h2>
        <p>QR Code: <span class="code">${code}</span></p>
        <p style="color:#666">Để xem chi tiết và xác thực, vui lòng mở ứng dụng trên máy quét nội bộ.</p>
    </div>
</body></html>`);
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
