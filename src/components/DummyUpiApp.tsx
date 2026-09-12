import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  QrCode,
  Send,
  Building2,
  User,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  Delete,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { PaymentTransaction, AppLanguage } from '../types/payment';
import { speakText, createSpeechRecognizer, requestMicPermission } from '../services/speechService';

interface DummyUpiAppProps {
  onInitiatePayment: (tx: PaymentTransaction | null) => void;
  pendingTx: PaymentTransaction | null;
  flowState: 'app_home' | 'voice_guard_active' | 'pin_entry' | 'success_receipt' | 'blocked_receipt';
  onProceedToPin: () => void;
  onPaymentComplete: () => void;
  onResetToHome: () => void;
  lang?: AppLanguage;
}

export const DummyUpiApp: React.FC<DummyUpiAppProps> = ({
  onInitiatePayment,
  pendingTx,
  flowState,
  onProceedToPin,
  onPaymentComplete,
  onResetToHome,
  lang = 'en'
}) => {
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceHeard, setVoiceHeard] = useState<string>('');
  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const recognizerRef = useRef<any>(null);

  const sampleMerchants: PaymentTransaction[] = [
    {
      vpa: 'electricity-fast-bill@okaxis',
      name: 'Quick Bill Payment Desk',
      amount: 9900.00,
      claimedAmount: 90.00,
      isVerifiedMerchant: false,
      isRefundScam: false
    },
    {
      vpa: 'scam-refund-agent@paytm',
      name: 'Customer Support Desk',
      amount: 7500.00,
      claimedAmount: null,
      isVerifiedMerchant: false,
      isRefundScam: true
    },
    {
      vpa: 'fresh-supermarket@icici',
      name: 'Fresh Groceries Supermarket',
      amount: 450.00,
      claimedAmount: null,
      isVerifiedMerchant: true,
      isRefundScam: false
    }
  ];

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setPinError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const handlePinSubmit = () => {
    if (pin.length === 4) {
      stopVoiceListener();
      onPaymentComplete();
      setPin('');
    } else {
      setPinError(true);
    }
  };

  const stopVoiceListener = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {}
      recognizerRef.current = null;
    }
    setIsVoiceActive(false);
  };

  const promptAndListenHome = () => {
    stopVoiceListener();
    setVoiceStatus('Speaking instructions...');
    const welcomeMsg =
      lang === 'hi'
        ? 'पेक्विक यूपीआई में आपका स्वागत है। स्कैनर खोलने के लिए "स्कैन क्यूआर कोड" कहें, या बिजली बिल अथवा सुपरमार्केट का नाम लें।'
        : 'Welcome to PayQuick UPI. Please say "Scan QR Code" to open scanner, or say "Pay Electricity" or "Pay Groceries".';

    speakText(
      welcomeMsg,
      lang,
      undefined,
      () => {
        startListeningHome();
      }
    );
  };

  const startListeningHome = () => {
    stopVoiceListener();
    setVoiceStatus('Listening for voice command...');

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        const lower = transcript.toLowerCase().trim();
        setVoiceHeard(lower);

        // 1. Scan QR / Camera command
        const scanCmds = ['scan', 'qr', 'scanner', 'camera', 'scan qr', 'scan qr code', 'kod', 'q r'];
        if (scanCmds.some(cmd => lower.includes(cmd))) {
          stopVoiceListener();
          setVoiceStatus('Recognized: Opening QR Scanner...');
          speakText(lang === 'hi' ? 'क्यूआर स्कैनर खोला जा रहा है' : 'Opening QR Scanner', lang, undefined, () => {
            onInitiatePayment(null);
          });
          return;
        }

        // 2. Electricity bill
        const elecCmds = ['electricity', 'bill', 'electric', 'power', 'bijli'];
        if (elecCmds.some(cmd => lower.includes(cmd))) {
          stopVoiceListener();
          setVoiceStatus('Recognized: Quick Bill Payment Desk');
          speakText(lang === 'hi' ? 'बिजली बिल चुना गया' : 'Selected Electricity Bill payment', lang, undefined, () => {
            onInitiatePayment(sampleMerchants[0]);
          });
          return;
        }

        // 3. Customer support / refund
        const supportCmds = ['support', 'customer', 'refund', 'agent'];
        if (supportCmds.some(cmd => lower.includes(cmd))) {
          stopVoiceListener();
          setVoiceStatus('Recognized: Customer Support Desk');
          speakText(lang === 'hi' ? 'कस्टमर सपोर्ट चुना गया' : 'Selected Customer Support payment', lang, undefined, () => {
            onInitiatePayment(sampleMerchants[1]);
          });
          return;
        }

        // 4. Groceries
        const groceryCmds = ['grocery', 'groceries', 'supermarket', 'fresh', 'kirana', 'rashan'];
        if (groceryCmds.some(cmd => lower.includes(cmd))) {
          stopVoiceListener();
          setVoiceStatus('Recognized: Fresh Groceries Supermarket');
          speakText(lang === 'hi' ? 'सुपरमार्केट चुना गया' : 'Selected Fresh Groceries payment', lang, undefined, () => {
            onInitiatePayment(sampleMerchants[2]);
          });
          return;
        }
      },
      () => setIsVoiceActive(true),
      () => setIsVoiceActive(false)
    );

    if (recognizer) {
      try {
        recognizer.start();
        recognizerRef.current = recognizer;
        setIsVoiceActive(true);
      } catch (err) {
        console.warn("Could not start home speech recognition:", err);
      }
    }
  };

  const promptAndListenPin = () => {
    stopVoiceListener();
    setVoiceStatus('Speaking PIN prompt...');
    const pinMsg =
      lang === 'hi'
        ? 'कृपया कीपैड पर अपना 4 अंकों का यूपीआई पिन दर्ज करें, या पिन बोलें।'
        : 'Please enter your four-digit UPI PIN on the keypad, or speak your digits.';

    speakText(
      pinMsg,
      lang,
      undefined,
      () => {
        startListeningPin();
      }
    );
  };

  const startListeningPin = () => {
    stopVoiceListener();
    setVoiceStatus('Listening for PIN digits...');

    const wordToNum: Record<string, string> = {
      'zero': '0', 'shunya': '0',
      'one': '1', 'ek': '1',
      'two': '2', 'do': '2',
      'three': '3', 'teen': '3',
      'four': '4', 'char': '4',
      'five': '5', 'paanch': '5',
      'six': '6', 'chhah': '6',
      'seven': '7', 'saat': '7',
      'eight': '8', 'aath': '8',
      'nine': '9', 'nau': '9'
    };

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        const lower = transcript.toLowerCase().trim();
        setVoiceHeard(lower);

        // Submit command
        if (lower.includes('submit') || lower.includes('confirm') || lower.includes('pay') || lower.includes('bhejo') || lower.includes('done')) {
          handlePinSubmit();
          return;
        }

        // Delete / clear command
        if (lower.includes('delete') || lower.includes('clear') || lower.includes('back') || lower.includes('remove') || lower.includes('hatao')) {
          handleDelete();
          return;
        }

        // Extract digits directly or convert word numbers
        let detected = '';
        const words = lower.split(/\s+/);
        for (const w of words) {
          if (wordToNum[w] !== undefined) {
            detected += wordToNum[w];
          } else {
            const digitMatch = w.match(/\d/g);
            if (digitMatch) detected += digitMatch.join('');
          }
        }

        if (detected.length > 0) {
          setPin(prev => {
            const nextPin = (prev + detected).slice(0, 4);
            if (nextPin.length === 4) {
              stopVoiceListener();
              setTimeout(() => {
                onPaymentComplete();
              }, 400);
            }
            return nextPin;
          });
        }
      },
      () => setIsVoiceActive(true),
      () => setIsVoiceActive(false)
    );

    if (recognizer) {
      try {
        recognizer.start();
        recognizerRef.current = recognizer;
        setIsVoiceActive(true);
      } catch (err) {
        console.warn("Could not start pin speech recognition:", err);
      }
    }
  };

  useEffect(() => {
    let timer: any;
    if (flowState === 'app_home') {
      timer = setTimeout(() => {
        promptAndListenHome();
      }, 700);
    } else if (flowState === 'pin_entry') {
      timer = setTimeout(() => {
        promptAndListenPin();
      }, 500);
    } else {
      stopVoiceListener();
    }

    return () => {
      clearTimeout(timer);
      stopVoiceListener();
    };
  }, [flowState, lang]);

  return (
    <div className="max-w-md mx-auto rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden font-sans text-slate-100 min-h-[580px] flex flex-col">
      {/* Phone Status Bar Header */}
      <div className="bg-slate-950 px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 font-bold text-sky-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>PayQuick UPI (Simulated App)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>

      {/* STATE 1: APP HOME SCREEN */}
      {flowState === 'app_home' && (
        <div className="flex-1 p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Top Search & Profile Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  AU
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-200">Alex User</div>
                  <div className="text-[10px] text-slate-400">alex@okicici</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Bank Linked
              </span>
            </div>

            {/* Banner: Extension Active */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/80 via-indigo-950/60 to-slate-900 border border-sky-500/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1">
                  <span>Voice Guard Extension Connected</span>
                  <Sparkles className="w-3 h-3 text-sky-400" />
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Scanning any QR will route through safety inspection before PIN entry.
                </div>
              </div>
            </div>

            {/* Interactive Voice Assistant Control Panel */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/40 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-red-400 animate-pulse' : 'text-sky-400'}`} />
                    <span>Voice Navigation: {isVoiceActive ? 'Listening...' : 'Ready'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={promptAndListenHome}
                  className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                  title="Replay Audio Instructions"
                >
                  <Volume2 className="w-3 h-3 text-sky-400" />
                  <span>Hear Prompt 🔊</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Say aloud any command:</div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 text-[10px]">
                    "Scan QR Code"
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                    "Pay Electricity"
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                    "Pay Groceries"
                  </span>
                </div>
              </div>

              {voiceHeard && (
                <div className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Heard speech:</span>
                  <span className="font-bold">"{voiceHeard}"</span>
                </div>
              )}
            </div>

            {/* Quick Action Grid */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Money Transfers</div>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => onInitiatePayment(null)}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-sky-500/40 hover:border-sky-400 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200">Scan QR Code</span>
                </button>

                <button
                  onClick={() => onInitiatePayment(null)}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center transition">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200">Pay VPA/Number</span>
                </button>

                <button
                  onClick={() => onInitiatePayment(null)}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200">Bank Transfer</span>
                </button>
              </div>
            </div>

            {/* Test Payment Scenarios */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Simulate Transaction Launch</div>
              <div className="space-y-2">
                {sampleMerchants.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => onInitiatePayment(m)}
                    className="w-full p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 flex items-center justify-between text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">{m.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{m.vpa}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-100">₹{m.amount.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-sky-400 flex items-center justify-end gap-0.5">
                        <span>Pay</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            Powered by Unified Payments Interface (NPCI) • Guard Extension Enabled
          </div>
        </div>
      )}

      {/* STATE 2: VOICE GUARD INTERCEPTOR ACTIVE */}
      {flowState === 'voice_guard_active' && (
        <div className="flex-1 p-5 space-y-4 flex flex-col justify-between bg-slate-950/90">
          <div className="space-y-3 text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Voice Guard Extension Intercepted Payment</h3>
              <p className="text-xs text-slate-400 mt-1">
                Please review the safety warning and approve or reject the payment on the Voice Guard panel below.
              </p>
            </div>

            {pendingTx && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Target Transaction</div>
                <div className="text-sm font-black text-white">₹{pendingTx.amount.toLocaleString('en-IN')}</div>
                <div className="text-xs font-semibold text-slate-300">{pendingTx.name}</div>
                <div className="text-[11px] font-mono text-slate-400">{pendingTx.vpa}</div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
            Waiting for Voice Command ("Approve" / "Reject") or Double-Tap action...
          </div>
        </div>
      )}

      {/* STATE 3: UPI PIN ENTRY SCREEN */}
      {flowState === 'pin_entry' && (
        <div className="flex-1 p-5 flex flex-col justify-between bg-slate-950">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={onResetToHome} className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>ENTER 4-DIGIT UPI PIN</span>
              </div>
              <div className="w-6" />
            </div>

            {/* Recipient & Amount Display */}
            <div className="text-center space-y-1">
              <div className="text-xs text-slate-400">Paying</div>
              <div className="text-3xl font-black text-white">₹{pendingTx?.amount.toLocaleString('en-IN')}</div>
              <div className="text-xs font-bold text-sky-400">{pendingTx?.name}</div>
              <div className="text-[11px] font-mono text-slate-400">HDFC Bank account ending in **** 4092</div>
            </div>

            {/* Masked PIN Dots */}
            <div className="flex justify-center items-center gap-4 py-2">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < pin.length
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="text-center text-xs text-red-400 font-semibold">
                Please enter a 4-digit PIN to confirm payment.
              </div>
            )}

            {/* Interactive Voice Assistant Control Panel for PIN Entry */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isVoiceActive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                    <span>Voice PIN: {isVoiceActive ? 'Listening...' : 'Ready'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={promptAndListenPin}
                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                  title="Replay PIN Audio Prompt"
                >
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Hear Prompt 🔊</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400">Speak aloud: </span>
                <span>Speak 4 digits (e.g. <strong className="text-emerald-300">"1 2 3 4"</strong>) or say <strong className="text-sky-300">"Submit"</strong></span>
              </div>
              {voiceHeard && (
                <div className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Heard:</span>
                  <span className="font-bold">"{voiceHeard}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Keypad */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-lg font-bold text-white transition active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleDelete}
                className="py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 flex items-center justify-center transition active:scale-95"
              >
                <Delete className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-lg font-bold text-white transition active:scale-95"
              >
                0
              </button>
              <button
                onClick={handlePinSubmit}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center transition active:scale-95 shadow-md shadow-emerald-600/30 font-bold"
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: SUCCESS RECEIPT */}
      {flowState === 'success_receipt' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-between text-center bg-slate-950">
          <div className="space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Payment Successful</h3>
              <p className="text-xs text-slate-400 mt-1">Verified & Processed via PayQuick UPI</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2 max-w-xs mx-auto">
              <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Amount Paid</span>
                <span className="text-base font-black text-white">₹{pendingTx?.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">To</span>
                <span className="font-bold text-slate-200">{pendingTx?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">UPI Ref ID</span>
                <span className="font-mono text-[11px] text-slate-300">429018592014</span>
              </div>
            </div>
          </div>

          <button
            onClick={onResetToHome}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Return to GPay Home</span>
          </button>
        </div>
      )}

      {/* STATE 5: BLOCKED RECEIPT */}
      {flowState === 'blocked_receipt' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-between text-center bg-slate-950">
          <div className="space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border-2 border-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Transaction Blocked</h3>
              <p className="text-xs text-slate-400 mt-1">Stopped by Voice Guard Security Extension</p>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/50 text-left space-y-1.5 max-w-xs mx-auto">
              <div className="text-xs font-bold text-red-300">Your Funds Are Safe</div>
              <p className="text-[11px] text-slate-300">
                No money was deducted from your bank account. The high-risk recipient was rejected.
              </p>
            </div>
          </div>

          <button
            onClick={onResetToHome}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Return to GPay Home</span>
          </button>
        </div>
      )}
    </div>
  );
};
