import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioStatusBar } from './components/AudioStatusBar';
import { ScenarioPicker } from './components/ScenarioPicker';
import { InputChannels } from './components/InputChannels';
import { PaymentGuardCard } from './components/PaymentGuardCard';
import { DummyUpiApp } from './components/DummyUpiApp';
import { PaymentTransaction, AppLanguage } from './types/payment';
import { evaluatePaymentRisk } from './services/heuristicsEngine';
import { audioSynthesizer } from './services/audioSynthesizer';
import { Smartphone, Shield, ArrowRight, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [fontScaled, setFontScaled] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<PaymentTransaction | null>(null);

  // Default to Step 1: Simulated UPI App Workflow
  const [currentPage, setCurrentPage] = useState<'app_home' | 'extension_page' | 'pin_page' | 'receipt_page' | 'blocked_page'>('app_home');

  // Play gentle test chime ONCE on startup without speaking scam warnings
  useEffect(() => {
    const timer = setTimeout(() => {
      audioSynthesizer.playEarcon('safe');
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectTransaction = (tx: PaymentTransaction, navigateToPin?: boolean) => {
    const withRisk = { ...tx, risk: evaluatePaymentRisk(tx) };
    setCurrentTransaction(withRisk);
    if (navigateToPin) {
      setCurrentPage('pin_page');
    } else {
      // When a transaction is selected or scanned, immediately route to the VoiceGuard Extension page
      setCurrentPage('extension_page');
    }
  };

  const handleApproveTransaction = () => {
    // Approved by VoiceGuard -> Move to Step 3: PIN Confirmation
    setCurrentPage('pin_page');
  };

  const handleRejectTransaction = () => {
    // Rejected by VoiceGuard -> Move to Step 4: Blocked Receipt
    setCurrentPage('blocked_page');
  };

  const handleResetFlow = () => {
    setCurrentTransaction(null);
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

  // Convert currentPage to flowState for DummyUpiApp
  const getDummyUpiFlowState = () => {
    if (currentPage === 'app_home') return 'app_home';
    if (currentPage === 'pin_page') return 'pin_entry';
    if (currentPage === 'blocked_page') return 'blocked_receipt';
    if (currentPage === 'receipt_page') return 'success_receipt';
    return 'voice_guard_active';
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

      {/* 4-STEP WORKFLOW PROGRESS BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800 py-3 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-xs font-bold">
            <span className="text-slate-400 uppercase tracking-wider text-[11px] mr-2">Simulated UPI Workflow:</span>

            {/* Step 1 */}
            <button
              onClick={() => setCurrentPage('app_home')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                currentPage === 'app_home'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">1</span>
              <span>Dummy UPI App</span>
            </button>

            <span className="text-slate-600">➔</span>

            {/* Step 2 */}
            <button
              onClick={() => setCurrentPage('extension_page')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                currentPage === 'extension_page'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">2</span>
              <span>VoiceGuard Extension</span>
            </button>

            <span className="text-slate-600">➔</span>

            {/* Step 3 */}
            <button
              onClick={() => setCurrentPage('pin_page')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                currentPage === 'pin_page'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">3</span>
              <span>PIN Entry</span>
            </button>

            <span className="text-slate-600">➔</span>

            {/* Step 4 */}
            <button
              onClick={() => setCurrentPage('receipt_page')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                currentPage === 'receipt_page' || currentPage === 'blocked_page'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">4</span>
              <span>Receipt</span>
            </button>
          </div>

          <button
            onClick={handleResetFlow}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 transition"
            title="Reset to Step 1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6" role="main">
        <AudioStatusBar lang={lang} />

        {/* ================= STEP 1: DUMMY UPI APP (HOME) ================= */}
        {currentPage === 'app_home' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Step 1 of 4 • Simulated Phone App
              </span>
              <h2 className="text-lg font-bold text-white pt-1">PayQuick UPI (Simulated User App)</h2>
              <p className="text-xs text-slate-400">
                Click <strong>"Scan QR Code"</strong> or pick a transaction below to see the VoiceGuard Extension intercept it!
              </p>
            </div>

            <DummyUpiApp
              pendingTx={currentTransaction}
              flowState="app_home"
              onInitiatePayment={(tx) => {
                if (tx) {
                  handleSelectTransaction(tx);
                } else {
                  // "Scan QR Code" clicked -> takes user directly to Page 2 (VoiceGuard Extension / Camera Scanner)
                  setCurrentPage('extension_page');
                }
              }}
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={() => setCurrentPage('receipt_page')}
              onResetToHome={handleResetFlow}
            />
          </div>
        )}

        {/* ================= STEP 2: VOICEGUARD EXTENSION (MAIN PAGE) ================= */}
        {currentPage === 'extension_page' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Step 2 of 4 • VoiceGuard Extension Interception</span>
              </div>
              <h2 className="text-xl font-extrabold text-white pt-1">
                Audio-First Verification & Scam Defense Layer
              </h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                VoiceGuard intercepts the payment intent, reads the recipient and spelled-out amount aloud in words, and checks for fraud heuristics before any PIN is entered.
              </p>
            </div>

            {/* Launch Camera Scanner & Interception Channels */}
            <InputChannels onIntercept={handleSelectTransaction} />

            {/* Quick Test Simulation Triggers */}
            <ScenarioPicker onSelectScenario={handleSelectTransaction} />

            {/* Main Payment Guard Card (Speaks warnings, handles double-tap and voice commands) */}
            <PaymentGuardCard
              tx={currentTransaction}
              lang={lang}
              onApprove={handleApproveTransaction}
              onReject={handleRejectTransaction}
            />
          </div>
        )}

        {/* ================= STEP 3: PIN CONFIRMATION SCREEN ================= */}
        {currentPage === 'pin_page' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Step 3 of 4 • PIN Confirmation
              </span>
              <h2 className="text-lg font-bold text-white pt-1">Enter 4-Digit UPI PIN</h2>
              <p className="text-xs text-slate-400">
                VoiceGuard verified this transaction. You can now enter your secret bank PIN safely.
              </p>
            </div>

            <DummyUpiApp
              pendingTx={currentTransaction}
              flowState="pin_entry"
              onInitiatePayment={handleSelectTransaction}
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={() => setCurrentPage('receipt_page')}
              onResetToHome={handleResetFlow}
            />
          </div>
        )}

        {/* ================= STEP 4: RECEIPT (SUCCESS OR BLOCKED) ================= */}
        {(currentPage === 'receipt_page' || currentPage === 'blocked_page') && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                currentPage === 'blocked_page'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                Step 4 of 4 • Final Transaction Status
              </span>
              <h2 className="text-lg font-bold text-white pt-1">
                {currentPage === 'blocked_page' ? 'Fraud Prevented Receipt' : 'Payment Completed Receipt'}
              </h2>
            </div>

            <DummyUpiApp
              pendingTx={currentTransaction}
              flowState={currentPage === 'blocked_page' ? 'blocked_receipt' : 'success_receipt'}
              onInitiatePayment={handleSelectTransaction}
              onProceedToPin={() => setCurrentPage('pin_page')}
              onPaymentComplete={() => setCurrentPage('receipt_page')}
              onResetToHome={handleResetFlow}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-4 text-center text-xs text-slate-500 bg-slate-950">
        <p className="font-medium text-slate-400">
          VoiceGuard UPI • Assistive Voice Verification & Fraud Protection
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Designed for independent, safe digital payments for blind, low-vision, and elderly citizens.
        </p>
      </footer>
    </div>
  );
};

export default App;
