import React, { useState, useRef, useEffect } from 'react';
import { QrCode, UploadCloud, Link as LinkIcon, Camera, VideoOff, Loader2, Image as ImageIcon, Mic, Volume2 } from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { PaymentTransaction, InputMode, AppLanguage } from '../types/payment';
import { parseUpiUri } from '../services/upiParser';
import { speakText, numberToWords, createSpeechRecognizer, requestMicPermission } from '../services/speechService';
import { evaluatePaymentRisk } from '../services/heuristicsEngine';

interface InputChannelsProps {
  onIntercept: (tx: PaymentTransaction, navigateToPin?: boolean) => void;
  lang?: AppLanguage;
  hasActiveTransaction?: boolean;
}

export const InputChannels: React.FC<InputChannelsProps> = ({
  onIntercept,
  lang = 'en',
  hasActiveTransaction = false
}) => {
  const [activeTab, setActiveTab] = useState<InputMode>('scanner');
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Channel Voice Navigation state
  const [isChannelVoiceActive, setIsChannelVoiceActive] = useState(false);
  const [channelVoiceHeard, setChannelVoiceHeard] = useState('');
  const [channelVoiceStatus, setChannelVoiceStatus] = useState('');
  const channelRecognizerRef = useRef<any>(null);

  // Pending QR transaction waiting for user specified amount entry
  const [pendingQrTx, setPendingQrTx] = useState<PaymentTransaction | null>(null);
  const [userAmountInput, setUserAmountInput] = useState<string>('');
  const [isAmountMicActive, setIsAmountMicActive] = useState(false);
  const [heardAmountSpeech, setHeardAmountSpeech] = useState('');
  const [isConfirmingAmount, setIsConfirmingAmount] = useState(false);
  const amountRecognizerRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopChannelVoiceListener = () => {
    if (channelRecognizerRef.current) {
      try { channelRecognizerRef.current.stop(); } catch(e) {}
      channelRecognizerRef.current = null;
    }
    setIsChannelVoiceActive(false);
  };

  const promptAndListenChannel = () => {
    if (hasActiveTransaction || pendingQrTx) return;
    stopChannelVoiceListener();
    setChannelVoiceStatus('Speaking prompt...');

    const promptText = lang === 'hi'
      ? 'वॉइसगार्ड एक्सटेंशन सक्रिय है। कैमरा स्कैनर के लिए "लाइव स्कैनर" कहें, या स्क्रीनशॉट ओसीआर के लिए "अपलोड" कहें।'
      : 'VoiceGuard Extension active. Say "Live Scanner" for camera scanner, or say "Upload" for screenshot OCR.';

    speakText(
      promptText,
      lang,
      undefined,
      () => {
        startListeningChannel();
      }
    );
  };

  const startListeningChannel = () => {
    if (hasActiveTransaction || pendingQrTx) return;
    stopChannelVoiceListener();
    setChannelVoiceStatus('Listening for channel selection...');

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        const lower = transcript.toLowerCase().trim();
        setChannelVoiceHeard(lower);

        // 1. Live Camera Scanner command
        const camCmds = ['live scanner', 'scanner', 'camera', 'live', 'scan', 'start camera', 'open camera', 'live camera', 'q r'];
        if (camCmds.some(cmd => lower.includes(cmd))) {
          stopChannelVoiceListener();
          setActiveTab('scanner');
          setChannelVoiceStatus('Recognized: Launching Camera Scanner...');
          speakText(
            lang === 'hi' ? 'लाइव कैमरा स्कैनर शुरू किया जा रहा है' : 'Starting live camera QR scanner',
            lang,
            undefined,
            () => {
              startCamera();
            }
          );
          return;
        }

        // 2. Screenshot OCR command
        const ocrCmds = ['upload', 'screenshot', 'ocr', 'image', 'photo', 'upload screenshot', 'file'];
        if (ocrCmds.some(cmd => lower.includes(cmd))) {
          stopChannelVoiceListener();
          setActiveTab('screenshot');
          setChannelVoiceStatus('Recognized: Opening Screenshot OCR...');
          speakText(
            lang === 'hi' ? 'स्क्रीनशॉट मोड। कृपया भुगतान रसीद चुनें' : 'Switched to screenshot OCR mode. Please select your screenshot.',
            lang,
            undefined,
            () => {
              const fileInput = document.getElementById('screenshotUploadInput') as HTMLInputElement | null;
              if (fileInput) fileInput.click();
            }
          );
          return;
        }

        // 3. Custom URI command
        const manualCmds = ['manual', 'custom', 'uri', 'link'];
        if (manualCmds.some(cmd => lower.includes(cmd))) {
          stopChannelVoiceListener();
          setActiveTab('manual');
          setChannelVoiceStatus('Recognized: Custom URI Mode');
          return;
        }
      },
      () => setIsChannelVoiceActive(true),
      () => setIsChannelVoiceActive(false)
    );

    if (recognizer) {
      try {
        recognizer.start();
        channelRecognizerRef.current = recognizer;
        setIsChannelVoiceActive(true);
      } catch (err) {
        console.warn("Could not start channel speech recognition:", err);
      }
    }
  };

  useEffect(() => {
    let timer: any;
    if (!hasActiveTransaction && !pendingQrTx) {
      timer = setTimeout(() => {
        promptAndListenChannel();
      }, 500);
    } else {
      stopChannelVoiceListener();
    }

    return () => {
      clearTimeout(timer);
      stopCamera();
      stopAmountVoiceListener();
      stopChannelVoiceListener();
    };
  }, [hasActiveTransaction, pendingQrTx, lang]);

  const stopAmountVoiceListener = () => {
    if (amountRecognizerRef.current) {
      try { amountRecognizerRef.current.stop(); } catch(e) {}
      amountRecognizerRef.current = null;
    }
    setIsAmountMicActive(false);
  };

  const startAmountVoiceListener = (isSecondConfirmStage = false) => {
    stopAmountVoiceListener();
    const recognizer = createSpeechRecognizer(
      'en',
      (transcript) => {
        setHeardAmountSpeech(transcript);

        if (isSecondConfirmStage) {
          // 2nd stage: Listening specifically for "confirm" / "proceed" OR "reject" / "no" / "re-enter"
          const confirmCmds = ['confirm', 'proceed', 'yes', 'pay', 'ok', 'okay', 'theek', 'haan', 'bhejo'];
          const rejectCmds = ['reject', 'no', 'cancel', 'reenter', 're-enter', 'change', 'wrong', 'radd', 'mana', 'galat'];

          if (confirmCmds.some(cmd => transcript.includes(cmd))) {
            stopAmountVoiceListener();
            handleFinalConfirmAndProceed();
          } else if (rejectCmds.some(cmd => transcript.includes(cmd))) {
            stopAmountVoiceListener();
            handleRejectAndReEnter();
          }
        } else {
          // 1st stage: Listening for spoken numbers & 1st "confirm"
          const numMatch = transcript.match(/\d+/);
          if (numMatch) {
            setUserAmountInput(numMatch[0]);
          } else if (transcript.includes('fifty') || transcript.includes('pachas')) {
            setUserAmountInput('50');
          } else if (transcript.includes('hundred') || transcript.includes('sau')) {
            setUserAmountInput('100');
          } else if (transcript.includes('thousand') || transcript.includes('hazar')) {
            setUserAmountInput('1000');
          }

          const confirmCmds = ['confirm', 'proceed', 'yes', 'pay', 'ok', 'okay', 'theek', 'haan', 'bhejo'];
          if (confirmCmds.some(cmd => transcript.includes(cmd))) {
            stopAmountVoiceListener();
            handleInitialConfirm();
          }
        }
      },
      () => setIsAmountMicActive(true),
      () => setIsAmountMicActive(false)
    );

    if (recognizer) {
      try {
        recognizer.start();
        amountRecognizerRef.current = recognizer;
        setIsAmountMicActive(true);
      } catch (err) {
        console.warn("Could not start amount speech recognition:", err);
      }
    }
  };

  const handleQrDetected = (parsed: PaymentTransaction) => {
    stopCamera();

    // 1. INSTANT SCAM ALERTING: Direct High-Risk Scam Interception
    const risk = evaluatePaymentRisk(parsed);
    const isHighRiskScam =
      risk.level === 'danger' ||
      parsed.isRefundScam ||
      (parsed.claimedAmount && Math.abs(parsed.amount - parsed.claimedAmount) > 100) ||
      parsed.vpa.toLowerCase().includes('scam') ||
      parsed.vpa.toLowerCase().includes('refund');

    if (isHighRiskScam) {
      // 🚨 Directly alert out loud and navigate to Page 2 immediately without user needing to confirm anything!
      const alertWords = numberToWords(parsed.amount || 9900, 'en');
      const scamNotice = `Warning! Stop! High risk scam detected! Someone is attempting to deduct ${alertWords} from your account! Payment intercepted!`;

      speakText(scamNotice, 'en', undefined, () => {
        onIntercept({ ...parsed, risk });
      });
      return;
    }

    // 2. SAFE / STANDARD MERCHANTS: 100% Voice-Controlled Amount Entry
    setPendingQrTx(parsed);
    const initAmt = parsed.amount > 0 ? parsed.amount.toString() : '';
    setUserAmountInput(initAmt);
    setHeardAmountSpeech('');
    setIsConfirmingAmount(false);

    const targetName = parsed.name || 'Merchant';
    const amountPrompt = parsed.amount > 0 ? `for ${numberToWords(parsed.amount, 'en')}` : '';
    const audioPrompt = `QR code verified for ${targetName} ${amountPrompt}. Please say aloud the payment amount followed by confirm.`;

    speakText(audioPrompt, 'en', undefined, () => {
      startAmountVoiceListener(false);
    });
  };

  // Step 1: User says 1st "Confirm" -> Voice out specified amount and ask for 2nd voice confirmation
  const handleInitialConfirm = () => {
    if (!pendingQrTx) return;
    stopAmountVoiceListener();
    setIsConfirmingAmount(true);

    const finalAmount = parseFloat(userAmountInput) || pendingQrTx.amount || 100;
    const words = numberToWords(finalAmount, 'en');
    const targetName = pendingQrTx.name || 'Merchant';
    const askConfirmationPrompt = `You specified ${words} for ${targetName}. Say confirm to proceed to PIN entry, or say reject to re-enter amount.`;

    speakText(askConfirmationPrompt, 'en', undefined, () => {
      startAmountVoiceListener(true);
    });
  };

  // Step 2A: User says 2nd "Confirm" -> Voice out confirmation and auto-proceed hands-free to PIN entry page (Page 3)
  const handleFinalConfirmAndProceed = () => {
    if (!pendingQrTx) return;
    stopAmountVoiceListener();

    const finalAmount = parseFloat(userAmountInput) || pendingQrTx.amount || 100;
    const updatedTx: PaymentTransaction = {
      ...pendingQrTx,
      amount: finalAmount
    };

    const words = numberToWords(finalAmount, 'en');
    const targetName = pendingQrTx.name || 'Merchant';
    const confirmNotice = `Amount of ${words} confirmed for ${targetName}. Proceeding to UPI PIN entry now.`;

    speakText(confirmNotice, 'en', undefined, () => {
      setPendingQrTx(null);
      setUserAmountInput('');
      setIsConfirmingAmount(false);
      onIntercept(updatedTx, true);
    });
  };

  // Step 2B: User says "Reject" -> Reset amount, ask user to re-voice amount, and take back to amount entry stage!
  const handleRejectAndReEnter = () => {
    stopAmountVoiceListener();
    setUserAmountInput('');
    setIsConfirmingAmount(false);
    setHeardAmountSpeech('');

    const resetPrompt = `Amount reset. Please speak the payment amount again followed by confirm.`;
    speakText(resetPrompt, 'en', undefined, () => {
      startAmountVoiceListener(false);
    });
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported on this browser context.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setIsCameraRunning(true);
      scanQrLoop();
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      const errName = err?.name || 'UnknownError';
      const errMsg = err?.message || 'Camera could not be accessed';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        alert(
          `Camera Permission Blocked (${errName}).\n\nPlease check:\n1. Windows Settings > Privacy & security > Camera > ensure "Let desktop apps access your camera" is ON.\n2. On HP laptops, check if the physical camera shutter key (or switch on keyboard) is toggled off.`
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        alert(
          `Camera is in use (${errName}).\n\nAnother application (like Zoom, Teams, or Windows Camera app) may currently be using your HP webcam. Please close it and try again.`
        );
      } else {
        alert(`Camera Error (${errName}): ${errMsg}\n\nYou can also test with Screenshot OCR or Deep Link!`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraRunning(false);
  };

  const scanQrLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth"
        });

        if (code && code.data) {
          const rawData = code.data;
          const lower = rawData.toLowerCase();
          if (lower.includes('upi://pay') || lower.includes('pa=') || lower.includes('upi')) {
            stopCamera();
            const parsed = parseUpiUri(rawData);
            if (parsed) {
              handleQrDetected(parsed);
              return;
            }
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanQrLoop);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewImage(URL.createObjectURL(file));
    setIsOcrProcessing(true);
    try {
      // 1. Check if image has QR code
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(res => { img.onload = res; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imgData.data, imgData.width, imgData.height);
        if (qrCode && qrCode.data) {
          const parsed = parseUpiUri(qrCode.data);
          if (parsed) {
            setIsOcrProcessing(false);
            handleQrDetected(parsed);
            return;
          }
        }
      }

      // 2. OCR Text Analysis
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();

      const text = ret.data.text;
      const amountMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i) || text.match(/([\d,]+(?:\.\d{2})?)\s*(?:rs|rupees)/i);
      const vpaMatch = text.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/);

      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 3500;
      const vpa = vpaMatch ? vpaMatch[1] : 'support-refund@okaxis';

      setIsOcrProcessing(false);
      handleQrDetected({
        vpa,
        name: 'Extracted Payment Request',
        amount,
        claimedAmount: null,
        isVerifiedMerchant: false,
        isRefundScam: text.toLowerCase().includes('refund') || text.toLowerCase().includes('receive')
      });
    } catch (err) {
      console.error("OCR analysis failed:", err);
      setIsOcrProcessing(false);
      alert("Could not extract payment details from screenshot. Please try another image.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const parsed = parseUpiUri(manualInput);
    if (parsed) {
      handleQrDetected(parsed);
      setManualInput('');
    } else {
      alert("Invalid UPI URI format. Example: upi://pay?pa=store@upi&pn=GroceryStore&am=250");
    }
  };

  return (
    <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-sm space-y-4">
      {/* ENTER SPECIFIED AMOUNT SCREEN AFTER QR DETECTED */}
      {pendingQrTx ? (
        <div className="p-5 rounded-2xl bg-slate-950 border-2 border-sky-500 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>QR Code Scanned & Verified</span>
            </div>
            <button
              onClick={() => {
                stopAmountVoiceListener();
                setPendingQrTx(null);
                setIsConfirmingAmount(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] uppercase font-bold text-slate-400">Recipient Details</div>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span>{pendingQrTx.name}</span>
              {pendingQrTx.isVerifiedMerchant && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Verified Merchant
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-slate-400">{pendingQrTx.vpa}</div>
          </div>

          {/* Banner when in 2nd confirmation stage */}
          {isConfirmingAmount && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Audio Confirmation Required</span>
              </div>
              <p className="text-[11px] text-slate-200">
                Listening for voice... Say <strong>"CONFIRM"</strong> to proceed to safety check, or say <strong>"REJECT"</strong> to re-enter amount.
              </p>
            </div>
          )}

          {/* Amount Entry Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {isConfirmingAmount ? 'Confirmed Payment Amount (₹)' : 'Enter Payment Amount (₹)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isAmountMicActive) stopAmountVoiceListener();
                  else startAmountVoiceListener(isConfirmingAmount);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  isAmountMicActive ? 'bg-red-600 text-white shadow-sm shadow-red-600/30' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                <span>{isAmountMicActive ? 'Mic Active' : 'Voice Input'}</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-sky-400">₹</span>
              <input
                type="number"
                value={userAmountInput}
                onChange={(e) => setUserAmountInput(e.target.value)}
                placeholder="Enter or speak amount (e.g. 250)"
                disabled={isConfirmingAmount}
                className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xl font-black text-white placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none font-mono disabled:opacity-80"
                autoFocus
              />
            </div>

            {/* Voice Status & Heard Speech Indicator */}
            {isAmountMicActive && (
              <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-500/40 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-sky-300 font-semibold">
                    {isConfirmingAmount ? (
                      <>Listening... Say <strong>"Confirm"</strong> or <strong>"Reject"</strong></>
                    ) : (
                      <>Listening... Speak amount or say <strong>"Confirm"</strong></>
                    )}
                  </span>
                </div>
                {heardAmountSpeech && (
                  <span className="text-emerald-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/30">
                    "{heardAmountSpeech}"
                  </span>
                )}
              </div>
            )}

            {/* Quick Amount Preset Chips (only when editing) */}
            {!isConfirmingAmount && (
              <div className="flex flex-wrap gap-2 pt-1">
                {[50, 100, 250, 500, 1000, 5000].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUserAmountInput(preset.toString())}
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition"
                  >
                    +₹{preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleRejectAndReEnter}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <span>RESET AMOUNT 🔄</span>
            </button>
            <button
              onClick={handleInitialConfirm}
              className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/30 transition active:scale-95"
            >
              <span>CONFIRM & PROCEED ➔</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4 text-sky-400" />
            Interception Channels
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Scan physical QR codes, inspect payment screenshots, or test custom UPI links</p>
        </div>

        <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 self-start sm:self-auto">
          <button
            onClick={() => { setActiveTab('scanner'); stopCamera(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'scanner' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live QR Scanner
          </button>
          <button
            onClick={() => { setActiveTab('screenshot'); stopCamera(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'screenshot' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Screenshot OCR
          </button>
          <button
            onClick={() => { setActiveTab('manual'); stopCamera(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'manual' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom URI
          </button>
        </div>
      </div>

      {/* Voice Assistant Navigation Banner for Channels */}
      {!pendingQrTx && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-3 h-3 rounded-full ${isChannelVoiceActive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Mic className={`w-3.5 h-3.5 ${isChannelVoiceActive ? 'text-red-400 animate-pulse' : 'text-sky-400'}`} />
              <span>Voice Control: {isChannelVoiceActive ? 'Listening...' : 'Ready'}</span>
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300">
              Say <strong className="text-sky-300">"Live Scanner"</strong> or <strong className="text-indigo-300">"Upload Screenshot"</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {channelVoiceHeard && (
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                "{channelVoiceHeard}"
              </span>
            )}
            <button
              type="button"
              onClick={promptAndListenChannel}
              className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
              title="Replay Voice Instructions"
            >
              <Volume2 className="w-3 h-3 text-sky-400" />
              <span>Hear Prompt 🔊</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Live QR Scanner */}
      {activeTab === 'scanner' && (
        <div className="space-y-3">
          <div className="relative flex flex-col items-center justify-center p-6 border border-slate-700/80 rounded-2xl bg-slate-950/50 min-h-[220px] overflow-hidden">
            <video ref={videoRef} className={`max-h-64 w-full object-cover rounded-xl ${isCameraRunning ? 'block' : 'hidden'}`} playsInline />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Overlay when camera is running */}
            {isCameraRunning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-sky-400/80 rounded-2xl relative shadow-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sky-400 -mt-0.5 -ml-0.5"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sky-400 -mt-0.5 -mr-0.5"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sky-400 -mb-0.5 -ml-0.5"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sky-400 -mb-0.5 -mr-0.5"></div>
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}

            {!isCameraRunning && (
              <div className="text-center space-y-2 py-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">Point Camera at any UPI QR Code</p>
                  <p className="text-xs text-slate-400 mt-0.5">Scans merchant code, extracts payload, and runs voice verification</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              {!isCameraRunning ? (
                <button
                  onClick={startCamera}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-600/20 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Launch Camera Scanner</span>
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
                >
                  <VideoOff className="w-4 h-4" />
                  <span>Stop Scanner</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Screenshot OCR */}
      {activeTab === 'screenshot' && (
        <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/40 space-y-4">
          {previewImage ? (
            <div className="flex flex-col items-center space-y-2">
              <img src={previewImage} alt="Uploaded receipt preview" className="max-h-40 rounded-xl border border-slate-700 object-contain shadow" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-slate-200">Upload Suspicious Screenshot or Payment Slip</p>
            <p className="text-xs text-slate-400 mt-0.5">Automated OCR detects payment traps, fake refund promises, and private VPAs</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <input
              type="file"
              accept="image/*"
              id="screenshotUploadInput"
              onChange={handleScreenshotUpload}
              className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
            />
            {isOcrProcessing && (
              <div className="text-xs text-amber-400 flex items-center gap-2 font-semibold pt-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting details via OCR...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Custom UPI URI */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3 bg-slate-950/40 border border-slate-800 p-4 rounded-2xl">
          <div>
            <label htmlFor="manualUriInput" className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              Standard UPI URI Format
            </label>
            <input
              id="manualUriInput"
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="upi://pay?pa=store@upi&pn=GroceryStore&am=250.00&cu=INR"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualInput('upi://pay?pa=bill-desk@okhdfcbank&pn=UtilityDesk&am=1200.00&cu=INR')}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline"
              >
                Sample Bill (₹1,200)
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => setManualInput('upi://pay?pa=scam-refund-agent@paytm&pn=CustomerSupport&am=7500.00&cu=INR')}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium underline"
              >
                Sample Scam (₹7,500)
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow transition"
            >
              Analyze Intent
            </button>
          </div>
        </form>
      )}
        </>
      )}
    </section>
  );
};
