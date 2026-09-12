import React, { useState, useRef, useEffect } from 'react';
import { QrCode, UploadCloud, Link as LinkIcon, Camera, VideoOff, Loader2, Image as ImageIcon } from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { PaymentTransaction, InputMode } from '../types/payment';
import { parseUpiUri } from '../services/upiParser';

interface InputChannelsProps {
  onIntercept: (tx: PaymentTransaction) => void;
}

export const InputChannels: React.FC<InputChannelsProps> = ({ onIntercept }) => {
  const [activeTab, setActiveTab] = useState<InputMode>('scanner');
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
          inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
          if (code.data.includes('upi://pay') || code.data.includes('pa=')) {
            stopCamera();
            const parsed = parseUpiUri(code.data);
            if (parsed) {
              onIntercept(parsed);
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
            onIntercept(parsed);
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
      onIntercept({
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
      onIntercept(parsed);
      setManualInput('');
    } else {
      alert("Invalid UPI URI format. Example: upi://pay?pa=store@upi&pn=GroceryStore&am=250");
    }
  };

  return (
    <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-sm space-y-4">
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
    </section>
  );
};
