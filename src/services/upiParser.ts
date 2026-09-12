import { PaymentTransaction } from '../types/payment';

export function parseUpiUri(uriString: string): PaymentTransaction | null {
  try {
    let clean = uriString.trim();
    if (clean.startsWith('upi://pay?')) {
      clean = clean.replace('upi://pay?', '');
    }
    const params = new URLSearchParams(clean);
    const pa = params.get('pa');
    if (!pa) return null;

    return {
      vpa: pa,
      name: decodeURIComponent(params.get('pn') || 'Merchant'),
      amount: parseFloat(params.get('am') || '0'),
      claimedAmount: null,
      isVerifiedMerchant: Boolean(params.get('mc')),
      isRefundScam: false
    };
  } catch (e) {
    console.error("Error parsing UPI URI:", e);
    return null;
  }
}
