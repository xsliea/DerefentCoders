import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Mic,
  XCircle,
  CheckCircle,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { PaymentTransaction, AppLanguage } from '../types/payment';
import { numberToWords, speakText, createSpeechRecognizer, requestMicPermission } from '../services/speechService';
import { audioSynthesizer } from '../services/audioSynthesizer';

interface PaymentGuardCardProps {
  tx: PaymentTransaction | null;
  lang: AppLanguage;
  onApprove?: () => void;
  onReject?: () => void;
}

export const PaymentGuardCard: React.FC<PaymentGuardCardProps> = ({ tx, lang, onApprove, onReject }) => {
  const [doubleTapCount, setDoubleTapCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [heardSpeech, setHeardSpeech] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<{ type: 'rejected' | 'approved'; text: string } | null>(null);
  const recognizerRef = useRef<any>(null);
  const doubleTapTimerRef = useRef<any>(null);

  const stopListening = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      recognizerRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    stopListening();

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        setHeardSpeech(transcript);

        const rejectKeywords = ['reject', 'cancel', 'stop', 'no', 'block', 'dont', "don't", 'radd', 'mana', 'nahi', 'rok', 'hatao'];
        const approveKeywords = ['approve', 'confirm', 'pay', 'yes', 'proceed', 'manzoor', 'theek', 'haan', 'bhejo'];

        const matchedReject = rejectKeywords.some(w => transcript.includes(w));
        const matchedApprove = approveKeywords.some(w => transcript.includes(w));

        if (matchedReject) {
          stopListening();
          rejectPayment();
        } else if (matchedApprove) {
          stopListening();
          approvePayment();
        }
      },
      () => setIsListening(true),
      () => setIsListening(false)
    );

    if (recognizer) {
      try {
        recognizer.start();
        recognizerRef.current = recognizer;
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  const approvePayment = () => {
    audioSynthesizer.playEarcon('safe');
    const amountVal = tx ? tx.amount : 0;
    const msg = lang === 'hi' ? `₹${amountVal} का भुगतान सुरक्षित रूप से पूरा हुआ` : `Payment of ₹${amountVal} completed safely`;
    setActionNotice({ type: 'approved', text: msg });
    speakText(msg, lang);
    if (onApprove) onApprove();
  };

  const rejectPayment = () => {
    audioSynthesizer.playEarcon('danger');
    const msg = lang === 'hi' ? "भुगतान रद्द कर दिया गया। आपका खाता सुरक्षित है।" : "Payment cancelled and blocked. Your funds are protected.";
    setActionNotice({ type: 'rejected', text: msg });
    speakText(msg, lang);
    if (onReject) onReject();
  };

  // Announce transaction and auto-activate listening when speech finishes
  useEffect(() => {
    if (!tx || !tx.risk) return;
    setActionNotice(null);
    setHeardSpeech('');

    audioSynthesizer.playEarcon(tx.risk.level);

    const amountVal = Number(tx.amount || 0);
    const words = numberToWords(amountVal, lang);

    const onFinishSpeaking = () => {
      // Automatically open the microphone so user can say "Reject" or "Approve" hands-free!
      startListening();
    };

    if (lang === 'hi') {
      if (tx.risk.level === 'danger') {
        speakText(
          `चेतावनी! रुकिए! यहाँ ${words} माँगे जा रहे हैं। यह एक धोखा हो सकता है। रद्द करने के लिए 'रिजेक्ट' बोलें या लाल बटन दबाएँ।`,
          'hi',
          undefined,
          onFinishSpeaking
        );
      } else if (tx.risk.level === 'warning') {
        speakText(
          `कृपया ध्यान दें। आप ${tx.name} को ${words} भेज रहे हैं। पुष्टि करने के लिए 'अप्रूव' बोलें।`,
          'hi',
          undefined,
          onFinishSpeaking
        );
      } else {
        speakText(
          `सुरक्षित भुगतान। ${tx.name} को ${words} का भुगतान। पुष्टि के लिए डबल टैप करें।`,
          'hi',
          undefined,
          onFinishSpeaking
        );
      }
    } else {
      if (tx.risk.level === 'danger') {
        speakText(
          `Warning! Stop! This transaction is asking to deduct ${words} to an unverified recipient. This is flagged as a high risk scam. Say 'Reject' or press the red button to cancel.`,
          'en',
          undefined,
          onFinishSpeaking
        );
      } else if (tx.risk.level === 'warning') {
        speakText(
          `Attention. You are sending ${words} to ${tx.name}. Say 'Approve' to proceed, or 'Reject' to cancel.`,
          'en',
          undefined,
          onFinishSpeaking
        );
      } else {
        speakText(
          `Safe payment verified. Paying ${words} to ${tx.name}. Double tap to confirm.`,
          'en',
          undefined,
          onFinishSpeaking
        );
      }
    }

    return () => {
      stopListening();
    };
  }, [tx, lang]);

  const handleDoubleTap = () => {
    if (!tx) return;

    if (doubleTapCount === 0) {
      setDoubleTapCount(1);
      audioSynthesizer.playEarcon('warning');
      speakText(lang === 'hi' ? "पुष्टि करने के लिए एक बार और दबाएँ" : "Tap once more to confirm payment", lang);

      doubleTapTimerRef.current = setTimeout(() => {
        setDoubleTapCount(0);
      }, 2500);
    } else {
      clearTimeout(doubleTapTimerRef.current);
      setDoubleTapCount(0);
      approvePayment();
    }
  };

  const toggleMic = async () => {
    if (isListening) {
      stopListening();
    } else {
      await requestMicPermission();
      startListening();
    }
  };

  const amountVal = tx ? Number(tx.amount || 0) : 0;
  const wordsVal = tx ? numberToWords(amountVal, lang) : 'Zero Rupees';
  const risk = tx?.risk;
  const isDanger = risk?.level === 'danger';
  const isWarning = risk?.level === 'warning';
  const isSafe = risk?.level === 'safe';

  return (
    <section
      className={`relative rounded-3xl p-6 md:p-7 shadow-2xl transition-all duration-300 border-2 overflow-hidden ${
        isDanger
          ? 'bg-gradient-to-b from-red-950/40 to-slate-900 border-red-500/80 shadow-red-950/40'
          : isWarning
          ? 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-amber-500/80 shadow-amber-950/40'
          : isSafe
          ? 'bg-gradient-to-b from-emerald-950/30 to-slate-900 border-emerald-500/80 shadow-emerald-950/40'
          : 'bg-slate-900 border-slate-800'
      }`}
      aria-live="polite"
    >
      {/* Top Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isDanger
                ? 'bg-red-600 shadow-red-600/30'
                : isWarning
                ? 'bg-amber-600 shadow-amber-600/30'
                : isSafe
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isWarning ? (
              <ShieldAlert className="w-6 h-6" />
            ) : isSafe ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Fingerprint className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-extrabold uppercase tracking-wider ${
                  isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : isSafe ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {isDanger
                  ? 'High Risk Scam Intercepted'
                  : isWarning
                  ? 'Unverified Recipient Warning'
                  : isSafe
                  ? 'Safe & Verified Merchant'
                  : 'Awaiting Payment Intent'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {risk ? risk.flags[0] || 'Verified payment transaction parameters' : 'Choose a simulation case or scan a QR code above'}
            </p>
          </div>
        </div>

        {/* Risk Score Pill */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div
            className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide border flex items-center gap-1.5 shadow-sm ${
              isDanger
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isSafe
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span>Risk Score:</span>
            <span className="font-mono text-sm">{risk ? risk.score : 0}/100</span>
          </div>
        </div>
      </div>

      {/* Main Payment Figures */}
      <div className="py-5 space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Deduction Amount
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-white tracking-tight">
              ₹{amountVal.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              INR
            </span>
          </div>

          {/* Spelled-Out Spoken Representation */}
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
            <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs md:text-sm font-bold tracking-wide">
              "{wordsVal}"
            </span>
          </div>
        </div>

        {/* Recipient & VPA Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recipient Name
            </span>
            <div className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
              <span>{tx?.name || 'Awaiting Input'}</span>
              {tx?.isVerifiedMerchant && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              UPI Handle (VPA)
            </span>
            <div className="text-xs md:text-sm font-mono font-medium text-slate-300 mt-1 break-all">
              {tx?.vpa || 'none@upi'}
            </div>
          </div>
        </div>

        {/* Detected Security Flags */}
        {risk && risk.flags.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/40 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              Security Flags Triggered:
            </span>
            <ul className="text-xs space-y-1.5 text-slate-200">
              {risk.flags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Plain-Language Explainer */}
        <div className="rounded-2xl p-4 bg-indigo-950/30 border border-indigo-700/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Plain-Language Verification</span>
            </div>
            <button
              onClick={() => {
                const text = lang === 'hi' ? risk?.explainerHi : risk?.explainerEn;
                if (text) speakText(text, lang);
              }}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 font-semibold transition"
              aria-label="Read explanation aloud"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Read Aloud</span>
            </button>
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
            {risk
              ? lang === 'hi'
                ? risk.explainerHi
                : risk.explainerEn
              : 'Select any transaction scenario above to test the plain-language safety engine.'}
          </p>
        </div>

        {/* In-App Action Notice (No freeze alert) */}
        {actionNotice && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all ${
              actionNotice.type === 'rejected'
                ? 'bg-red-950/90 border-red-500 text-red-200 shadow-red-950/50'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              {actionNotice.type === 'rejected' ? (
                <XCircle className="w-6 h-6 text-red-400 shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {actionNotice.type === 'rejected' ? 'Defense Activated' : 'Payment Cleared'}
                </div>
                <div className="text-xs md:text-sm font-bold mt-0.5">{actionNotice.text}</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 font-bold border border-white/10">
              {actionNotice.type === 'rejected' ? 'Blocked' : 'Approved'}
            </span>
          </div>
        )}

        {/* Voice Command & Action Buttons */}
        <div className="pt-2 space-y-3">
          {/* Hands-Free Voice Prompt Bar */}
          <div
            className={`p-3.5 border rounded-2xl flex items-center justify-between transition-all ${
              isListening
                ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-500/20 ring-1 ring-sky-400/50'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-xs font-medium text-slate-200">
                {isListening ? (
                  <>
                    <span className="text-sky-300 font-bold">Mic Active:</span> Speak <strong>"Reject"</strong> or <strong>"Approve"</strong>...
                  </>
                ) : heardSpeech ? (
                  <>
                    <span className="text-emerald-400 font-bold">Heard:</span> <em>"{heardSpeech}"</em>
                  </>
                ) : (
                  <>Voice Guard: Speak <strong>"Reject"</strong> or <strong>"Approve"</strong></>
                )}
              </span>
            </div>
            <button
              onClick={toggleMic}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                isListening
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              aria-label="Activate microphone for voice confirmation"
            >
              <Mic className="w-3.5 h-3.5 text-sky-400" />
              <span>{isListening ? 'Listening...' : 'Voice Command'}</span>
            </button>
          </div>

          {/* Giant Tactile Confirm/Reject Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Reject Button */}
            <button
              onClick={rejectPayment}
              className="py-4 px-5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm md:text-base flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20 focus:ring-4 focus:ring-red-400 transition"
              aria-label="Reject and Cancel Payment"
            >
              <XCircle className="w-5 h-5" />
              <span>REJECT & CANCEL</span>
            </button>

            {/* Double-Tap Approve Button */}
            <button
              onClick={handleDoubleTap}
              className={`py-4 px-5 rounded-2xl font-black text-sm md:text-base flex items-center justify-center space-x-2 shadow-lg transition active:scale-95 ${
                doubleTapCount === 1
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
              aria-label="Approve payment. Double tap anywhere to confirm."
            >
              <CheckCircle className="w-5 h-5" />
              <span>{doubleTapCount === 1 ? 'TAP ONCE MORE TO CONFIRM' : 'DOUBLE TAP TO APPROVE'}</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            *Double-tap confirmation barrier prevents accidental single-touch payment execution.
          </p>
        </div>
      </div>
    </section>
  );
};
