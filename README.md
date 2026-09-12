# 🛡️ VoiceGuard UPI
### *Assistive Audio Verification & Scam Protection Layer for Digital Payments*

VoiceGuard is an accessible, audio-first payment verification and fraud defense companion built to protect visually impaired, low-vision, and elderly users from UPI payment fraud, QR code tampering, and social engineering scams.

---

## 🎯 The Problem

India processes over **14 Billion UPI transactions every month**. While fast and convenient, existing payment applications (Google Pay, PhonePe, Paytm, BHIM) rely almost entirely on **visual confirmation screens**:

1. **The Accessibility Verification Gap**: Visually impaired and elderly citizens cannot independently audit the payment amount or recipient VPA before typing their 4- or 6-digit PIN.
2. **Scam Exploitation**:
   - **Amount Inflation ("Zero Trap")**: A physical vendor poster or digital flyer claims a "₹90 bill payment", but the underlying QR code silently requests **₹9,900.00**.
   - **Reverse Payment Fraud**: Attackers pose as customer care agents or OLX buyers and tell the victim to *"scan this QR or enter your PIN to receive your ₹5,000 refund"*, exploiting confusion between pay and collect intents.
   - **Typosquatted VPAs**: Fraudulent accounts registered under deceptive handles like `electricity-bill-desk@okaxis` or `paytm-care-refund@ybl`.

VoiceGuard introduces a **multi-modal assistive shield** that translates transaction payloads into natural spoken language (*"Nine Thousand Nine Hundred Rupees"*, not raw digits), runs real-time heuristic security checks, and enforces voice or tactile double-tap confirmation.

---

## 🚀 Key Capabilities

- **Natural Language Audio Readout**: Synthesizes amounts in clear, spelled-out words (English and Hindi) to eliminate visual digit misinterpretation.
- **Auditory Earcons & Haptic Cues**: Generates distinct harmonic audio tones for verified transactions and urgent multi-pulse alarm buzzes with device vibration for high-risk flags.
- **Deterministic Heuristics Engine**: Real-time client-side analysis checking for amount discrepancies, known scam keywords (`refund`, `kyc`, `helpline`), and unverified individual VPAs with zero server latency.
- **Tactile Double-Tap Guard**: Replaces accidental or rushed single clicks with an intentional double-tap confirmation barrier.
- **Hands-Free Speech Confirmation**: Users can speak *"Approve"* or *"Reject"* without needing to locate visual buttons.
- **Multi-Source Interception**: Supports live camera QR scanning, screenshot OCR analysis for WhatsApp payment requests, and direct UPI URI deep links.
- **Accessibility Modes**: Integrated Yellow-on-Black High Contrast theme and dynamic text scaling up to 125%.

---

## 💻 Tech Stack & Architecture

```
+---------------------------------------------------------------------------------+
|                               VoiceGuard UPI Shield                             |
|                                                                                 |
|  [ Live Camera QR / Image OCR / UPI URI Deep Links / Presets ]                  |
|                                      │                                          |
|                                      ▼                                          |
|  [ Deterministic Risk Heuristics Engine ]                                       |
|    - Amount Mismatch Verification (Claimed vs Actual)                           |
|    - Keyword Scrutiny ('refund', 'kyc', 'support', 'cashback')                  |
|    - Threshold Variance & Round-Number Spikes                                   |
|    - Merchant Certificate & VPA Legitimacy                                      |
|                                      │                                          |
|                                      ▼                                          |
|  [ Multi-Modal Assistive Layer ]                                                |
|    - Web Speech Synthesis (EN-IN & HI-IN natural spoken text)                   |
|    - Web Audio API Custom Tone Generator (Harmonic vs Danger)                   |
|    - Device Vibration Haptics Engine                                            |
|    - Speech Recognition STT for Spoken Approval                                 |
|    - Tactile Double-Tap Gesture Guard                                           |
+---------------------------------------------------------------------------------+
```

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Bundler & Tooling**: Vite, PostCSS, Autoprefixer
- **Audio & Speech**: Web Speech API (TTS & STT), Web Audio API
- **Computer Vision**: `jsQR` (camera stream analyzer), `Tesseract.js` (optical character recognition)

---

## 🏃 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Visit `http://localhost:5173` in Google Chrome or Microsoft Edge.

---

## 📱 Progressive Web App (PWA)
VoiceGuard includes a `manifest.json` and responsive viewport configuration, allowing it to be installed as a standalone app on Android and iOS devices directly from the browser.
