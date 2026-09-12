import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioStatusBar } from './components/AudioStatusBar';
import { InputChannels } from './components/InputChannels';
import { PaymentGuardCard } from './components/PaymentGuardCard';
import { PaymentTransaction, AppLanguage } from './types/payment';
import { evaluatePaymentRisk } from './services/heuristicsEngine';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [fontScaled, setFontScaled] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<PaymentTransaction | null>(null);

  const handleSelectTransaction = (tx: PaymentTransaction) => {
    const withRisk = { ...tx, risk: evaluatePaymentRisk(tx) };
    setCurrentTransaction(withRisk);
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
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6" role="main">
        <AudioStatusBar lang={lang} />
        <InputChannels onIntercept={handleSelectTransaction} />
        <PaymentGuardCard tx={currentTransaction} lang={lang} />
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
