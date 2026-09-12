import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioStatusBar } from './components/AudioStatusBar';
import { ScenarioPicker } from './components/ScenarioPicker';
import { InputChannels } from './components/InputChannels';
import { PaymentGuardCard } from './components/PaymentGuardCard';
import { DummyUpiApp } from './components/DummyUpiApp';
import { PaymentTransaction, AppLanguage } from './types/payment';
import { evaluatePaymentRisk } from './services/heuristicsEngine';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [fontScaled, setFontScaled] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<PaymentTransaction | null>(null);

  // Dedicated Page Router State: 'app_home' | 'extension_page' | 'pin_page' | 'receipt_page' | 'blocked_page'
  const [currentPage, setCurrentPage] = useState<'app_home' | 'extension_page' | 'pin_page' | 'receipt_page' | 'blocked_page'>('app_home');

  // PAGE 1 -> PAGE 2 / 3: User initiates payment or completes voice amount verification
  const handleInitiatePayment = (tx: PaymentTransaction | null, navigateToPin: boolean = false) => {
    if (tx) {
      const withRisk = { ...tx, risk: evaluatePaymentRisk(tx) };
      setCurrentTransaction(withRisk);
      if (navigateToPin) {
        setCurrentPage('pin_page');
        return;
      }
    } else {
      setCurrentTransaction(null);
    }
    setCurrentPage('extension_page');
  };

  // PAGE 2 -> PAGE 3: VoiceGuard Extension approves payment
  const handleGuardApprove = () => {
    setTimeout(() => {
      setCurrentPage('pin_page');
    }, 1000);
  };

  // PAGE 2 -> PAGE 4: VoiceGuard Extension rejects payment
  const handleGuardReject = () => {
    setTimeout(() => {
      setCurrentPage('blocked_page');
    }, 1000);
  };

  // PAGE 3 -> PAGE 4: User completes PIN entry
  const handlePinComplete = () => {
    setCurrentPage('receipt_page');
  };

  // RESET back to Page 1
  const handleResetToHome = () => {
    setCurrentPage('app_home');
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  const toggleContrast = () => {
    const newVal = !highContrast;
    setHighContrast(newVal);
    document.body.classList.toggle('high-contrast-mode', newVal);
  };

  const toggleFontScale = () => {
    const newVal = !fontScaled;
    setFontScaled(newVal);
    document.body.classList.toggle('font-scaled-lg', newVal);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${highContrast ? 'high-contrast-mode' : ''}`}>
      <Header
        lang={lang}
        onToggleLang={toggleLanguage}
        highContrast={highContrast}
        onToggleContrast={toggleContrast}
        fontScaled={fontScaled}
        onToggleFontScale={toggleFontScale}
        currentPage={currentPage}
        onNavigatePage={(pg) => setCurrentPage(pg)}
      />

      {/* Visual Step Progress Bar */}
      <div className="bg-slate-900 border-b border-slate-800 py-2 px-4 text-center">
        <div className="max-w-xl mx-auto flex items-center justify-between text-xs font-bold">
          <div className={`flex items-center gap-1.5 ${currentPage === 'app_home' ? 'text-sky-400 font-extrabold' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">1</span>
            <span>Dummy UPI App</span>
          </div>
          <span className="text-slate-700">➔</span>
          <div className={`flex items-center gap-1.5 ${currentPage === 'extension_page' ? 'text-sky-400 font-extrabold' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">2</span>
            <span>VoiceGuard Extension</span>
          </div>
          <span className="text-slate-700">➔</span>
          <div className={`flex items-center gap-1.5 ${currentPage === 'pin_page' ? 'text-sky-400 font-extrabold' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">3</span>
            <span>PIN Entry</span>
          </div>
          <span className="text-slate-700">➔</span>
          <div className={`flex items-center gap-1.5 ${currentPage === 'receipt_page' || currentPage === 'blocked_page' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">4</span>
            <span>Receipt</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6" role="main">
        {/* PAGE 1: DUMMY UPI APP HOME */}
        {currentPage === 'app_home' && (
          <div className="space-y-6">
            <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-4 text-center space-y-1">
              <div className="text-xs font-bold text-sky-300">📱 Step 1: Simulated UPI App (PayQuick / GPay)</div>
              <div className="text-[11px] text-slate-300">
                Click <strong>"Scan QR Code"</strong> or select any merchant below to navigate to <strong>Page 2 (VoiceGuard Security Extension)</strong>.
              </div>
            </div>

            <DummyUpiApp
              onInitiatePayment={handleInitiatePayment}
              pendingTx={currentTransaction}
              flowState="app_home"
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={handlePinComplete}
              onResetToHome={handleResetToHome}
            />
          </div>
        )}

        {/* PAGE 2: VOICEGUARD SECURITY EXTENSION PAGE (MAIN DEREFENT CODERS PROJECT) */}
        {currentPage === 'extension_page' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <button
                onClick={handleResetToHome}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 flex items-center gap-1.5"
              >
                ← Back to Dummy App
              </button>
              <div className="text-xs font-black text-sky-400 uppercase tracking-widest">
                🛡️ Page 2: VoiceGuard Security Extension
              </div>
              <div className="w-24" />
            </div>

            <AudioStatusBar lang={lang} />
            <InputChannels onIntercept={handleInitiatePayment} />
            <PaymentGuardCard
              tx={currentTransaction}
              lang={lang}
              onApprove={handleGuardApprove}
              onReject={handleGuardReject}
            />
          </div>
        )}

        {/* PAGE 3: DUMMY APP UPI PIN KEYPAD PAGE */}
        {currentPage === 'pin_page' && (
          <div className="space-y-6">
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
              <div className="text-xs font-bold text-emerald-300">🔒 Step 3: Verified & Approved ➔ Enter 4-Digit UPI PIN</div>
              <div className="text-[11px] text-slate-300">
                VoiceGuard verified transaction safety. Enter your PIN below to authorize funds transfer.
              </div>
            </div>

            <DummyUpiApp
              onInitiatePayment={handleInitiatePayment}
              pendingTx={currentTransaction}
              flowState="pin_entry"
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={handlePinComplete}
              onResetToHome={handleResetToHome}
            />
          </div>
        )}

        {/* PAGE 4: PAYMENT SUCCESSFUL / BLOCKED RECEIPT PAGE */}
        {(currentPage === 'receipt_page' || currentPage === 'blocked_page') && (
          <div className="space-y-6">
            <DummyUpiApp
              onInitiatePayment={handleInitiatePayment}
              pendingTx={currentTransaction}
              flowState={currentPage === 'receipt_page' ? 'success_receipt' : 'blocked_receipt'}
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={handlePinComplete}
              onResetToHome={handleResetToHome}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-4 text-center text-xs text-slate-500 bg-slate-950">
        <p className="font-medium text-slate-400">
          VoiceGuard UPI • Assistive Voice Verification & Fraud Protection Extension
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Designed for independent, safe digital payments for blind, low-vision, and elderly citizens.
        </p>
      </footer>
    </div>
  );
};

export default App;
