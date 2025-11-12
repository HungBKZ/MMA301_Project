// paymentService.js
// Abstraction for external payment gateways (MoMo, Bank). Currently mocked.
// Replace mocks by wiring to your backend endpoint that talks to real gateways.

/**
 * Contract:
 * startPayment(method, { amount, orderId, orderInfo, returnUrl })
 * - method: 'MOMO' | 'BANK'
 * - returns: Promise<{ success: boolean, paid: boolean, message?: string }>
 */

export async function startPayment(method, { amount, orderId, orderInfo, returnUrl }) {
  // TODO: Replace with real network call to your backend:
  // const res = await fetch(`${API_BASE}/payments/${method.toLowerCase()}`, { ... })
  // return await res.json();

  // Mock gateway behavior
  await sleep(1200);
  if (!amount || amount <= 0) return { success: false, paid: false, message: 'Invalid amount' };

  // 80% success rate in mock
  const ok = Math.random() < 0.8;
  if (ok) {
    return { success: true, paid: true };
  }
  return { success: true, paid: false, message: 'Thanh toán thất bại (mô phỏng)' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default { startPayment };
