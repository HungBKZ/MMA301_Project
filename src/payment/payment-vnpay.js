import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Start VNPay payment by requesting backend to create signed URL
export async function startVnpayPayment({ apiBase, amount, orderId, orderInfo, bankCode, useWebView = false }) {
    if (!apiBase) throw new Error('Thiếu apiBase cho VNPay');

    // Quick reachability check with timeout to surface clearer error
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
        await fetch(`${apiBase}/`, { method: 'GET', signal: controller.signal });
    } catch (e) {
        clearTimeout(timer);
        throw new Error(`Không thể kết nối tới API_BASE: ${apiBase}. Hãy đảm bảo thiết bị và server cùng mạng, hoặc dùng HTTPS/ngrok. Gốc lỗi: ${e?.message || e}`);
    }
    clearTimeout(timer);

    // Build a device-specific deep link that Expo Go or dev client can open
    // For Expo Go in dev, this will look like: exp://<LAN_IP>:8081/--/payment/vnpay-return
    // For standalone/dev-client, it will resolve to your custom scheme.
    const returnDeeplink = Linking.createURL('payment/vnpay-return');

    const payload = { amount, orderId, orderInfo, bankCode, returnDeeplink, useWebView: !!useWebView };
    let status = 0;
    let bodyText = '';
    let json;
    try {
        const r = await fetch(`${apiBase}/payment/vnpay/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        status = r.status;
        const ct = r.headers?.get?.('content-type') || '';
        bodyText = await r.text();
        if (ct.includes('application/json') || bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')) {
            try { json = JSON.parse(bodyText); } catch (_) { /* fallthrough */ }
        }
    } catch (e) {
        throw new Error(`Không gọi được /payment/vnpay/create tại ${apiBase}. ${e?.message || e}`);
    }

    if (json?.payUrl) {
        if (useWebView) {
            // Let caller open inside WebView
            return { orderId: json.orderId, txnRef: json.txnRef, payUrl: json.payUrl };
        }
        await Linking.openURL(json.payUrl);
        return { orderId: json.orderId, txnRef: json.txnRef };
    }
    const snippet = (bodyText || '').slice(0, 200);
    const details = json?.error || snippet || 'No response body';
    throw new Error(`VNPay backend không trả JSON hợp lệ (HTTP ${status}). Chi tiết: ${details}`);
}

// Subscribe deep link return (scheme://payment/vnpay-return?...)
export function subscribePaymentReturn(onResult) {
    const handler = ({ url }) => {
        if (!url) return;
        try {
            // Only handle our vnpay return path
            if (!url.includes('payment/vnpay-return')) return;
            // Use WHATWG URL (supported in RN Hermes) or fallback parse
            let paramsObj = {};
            try {
                const u = new URL(url);
                paramsObj = Object.fromEntries(u.searchParams.entries());
            } catch (e) {
                const q = url.split('?')[1];
                if (q) q.split('&').forEach(p => { const [k, v] = p.split('='); paramsObj[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
            }
            onResult(paramsObj);
        } catch (_) { /* ignore */ }
    };

    const sub = Linking.addEventListener('url', handler);
    // Handle cold start
    Linking.getInitialURL().then((initial) => initial && handler({ url: initial }));
    return () => sub.remove();
}

// Helper to build API base from development environment
export function resolveApiBase(devHost) {
    // For LAN testing you must expose the server (same network) e.g. http://192.168.1.10:3001
    if (!devHost) devHost = 'localhost';
    // Android emulator can't access host localhost directly
    const host = Platform.OS === 'android' && (devHost === 'localhost' || devHost === '127.0.0.1') ? '10.0.2.2' : devHost;
    return `http://${host}:3001`;
}

// Auto detect API base: prefer app.json extra.API_BASE; fallback to Metro host
export function getApiBase() {
    // 1. Environment variable override (set in .env as EXPO_PUBLIC_API_BASE for Expo)
    //    This lets you change the tunnel / domain without editing app.json.
    const envBase = process.env?.EXPO_PUBLIC_API_BASE || process.env?.API_BASE;
    if (typeof envBase === 'string' && envBase.length > 0) {
        return envBase.trim();
    }

    // 2. Explicit app.json extra.API_BASE (fallback if env not set)
    const extra = (Constants?.expoConfig?.extra ?? {});
    if (typeof extra.API_BASE === 'string' && extra.API_BASE.length > 0) {
        return extra.API_BASE;
    }

    // Fallback: infer from Metro host
    const hostUri = Constants?.expoConfig?.hostUri || '';
    // e.g., hostUri: "192.168.1.23:8081" or "localhost:8081"
    const host = hostUri.split(':')[0];
    return resolveApiBase(host || 'localhost');
}

export default { startVnpayPayment, subscribePaymentReturn, resolveApiBase, getApiBase };