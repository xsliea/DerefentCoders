import { PaymentTransaction, RiskAnalysis, RiskLevel } from '../types/payment';
import { numberToWords } from './speechService';

export function evaluatePaymentRisk(tx: PaymentTransaction): RiskAnalysis {
  const flags: string[] = [];
  let score = 5;
  let level: RiskLevel = 'safe';

  const amount = Number(tx.amount || 0);
  const vpa = (tx.vpa || '').toLowerCase();
  const name = (tx.name || '').toLowerCase();

  // 1. Zero Trap Heuristic (Amount mismatch)
  if (tx.claimedAmount && Math.abs(amount - tx.claimedAmount) > 100) {
    score += 65;
    flags.push(`CRITICAL: Amount mismatch! Offer said ₹${tx.claimedAmount}, but QR payload asks for ₹${amount.toFixed(2)}`);
  }

  // 2. High amount round numbers
  if (amount >= 5000) {
    score += 25;
    flags.push(`Large transaction amount (₹${amount.toLocaleString('en-IN')})`);
  }

  // 3. Suspicious keywords in VPA
  const suspiciousKeywords = ['support', 'refund', 'kyc', 'customer', 'helpline', 'care', 'cashback', 'reward', 'lottery'];
  const matchedKeyword = suspiciousKeywords.find(k => vpa.includes(k) || name.includes(k));
  if (matchedKeyword) {
    score += 45;
    flags.push(`Suspicious keyword '${matchedKeyword}' in recipient address`);
  }

  // 4. Reverse Payment Scam
  if (tx.isRefundScam || vpa.includes('refund') || name.includes('refund')) {
    score += 55;
    flags.push(`REVERSE PAYMENT ALERT: You NEVER scan a QR code or enter a PIN to receive money!`);
  }

  // 5. Unverified generic private handle
  if (!tx.isVerifiedMerchant && amount > 1000) {
    score += 15;
    flags.push(`Unverified individual account with no verified merchant certificate`);
  }

  let explainerEn = '';
  let explainerHi = '';

  if (score >= 60) {
    level = 'danger';
    explainerEn = `STOP! High risk scam detected. Someone is attempting to deduct ₹${amount.toLocaleString('en-IN')} (${numberToWords(amount, 'en')}) from your account. Legitimate companies never ask you to scan a QR code to receive money. Double-check before approving.`;
    explainerHi = `रुकिए! यह एक धोखा हो सकता है। कोई आपके खाते से ₹${amount.toLocaleString('en-IN')} (${numberToWords(amount, 'hi')}) काटने की कोशिश कर रहा है। रिफंड या पैसे पाने के लिए कभी QR कोड स्कैन न करें।`;
  } else if (score >= 30) {
    level = 'warning';
    explainerEn = `Notice: Please verify this transaction. You are sending ₹${amount.toLocaleString('en-IN')} (${numberToWords(amount, 'en')}) to ${tx.name}. Confirm if you personally know this recipient.`;
    explainerHi = `ध्यान दें: कृपया ध्यान से जांचें। आप ${tx.name} को ₹${amount.toLocaleString('en-IN')} भेज रहे हैं। क्या आप इस व्यक्ति को जानते हैं?`;
  } else {
    level = 'safe';
    score = Math.min(score, 15);
    explainerEn = `This is a verified merchant transaction for ₹${amount.toLocaleString('en-IN')} (${numberToWords(amount, 'en')}) to ${tx.name}. Everything looks normal.`;
    explainerHi = `यह ${tx.name} के लिए ₹${amount.toLocaleString('en-IN')} (${numberToWords(amount, 'hi')}) का सामान्य और सुरक्षित भुगतान है।`;
  }

  return {
    score: Math.min(score, 100),
    level,
    flags,
    explainerEn,
    explainerHi
  };
}
