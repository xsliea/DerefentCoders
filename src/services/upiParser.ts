import { PaymentTransaction } from '../types/payment';

export function parseUpiUri(uriString: string): PaymentTransaction | null {
  try {
    let clean = uriString.trim();
    if (clean.toLowerCase().includes('upi://pay?')) {
      const idx = clean.toLowerCase().indexOf('upi://pay?');
      clean = clean.substring(idx + 10);
    } else if (clean.toLowerCase().includes('upi://pay')) {
      const idx = clean.toLowerCase().indexOf('upi://pay');
      clean = clean.substring(idx + 9);
      if (clean.startsWith('?')) clean = clean.substring(1);
    }
    
    const params = new URLSearchParams(clean);
    let pa = params.get('pa') || params.get('PA') || params.get('Pa');
    if (!pa) {
      const paMatch = clean.match(/(?:pa|PA)=([^&]+)/i);
      if (paMatch) pa = decodeURIComponent(paMatch[1]);
    }

    if (!pa) return null;

    let pn = params.get('pn') || params.get('PN') || params.get('Pn');
    if (!pn) {
      const pnMatch = clean.match(/(?:pn|PN)=([^&]+)/i);
      if (pnMatch) pn = decodeURIComponent(pnMatch[1]);
    }

    let am = params.get('am') || params.get('AM') || params.get('Am');
    if (!am) {
      const amMatch = clean.match(/(?:am|AM)=([^&]+)/i);
      if (amMatch) am = amMatch[1];
    }

    return {
      vpa: pa,
      name: pn ? decodeURIComponent(pn) : 'Merchant',
      amount: parseFloat(am || '0'),
      claimedAmount: null,
      isVerifiedMerchant: Boolean(params.get('mc') || params.get('MC')),
      isRefundScam: false
    };
  } catch (e) {
    console.error("Error parsing UPI URI:", e);
    return null;
  }
}
