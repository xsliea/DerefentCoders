import React, { useState } from 'react';
import { ShieldCheck, Volume2, Waves } from 'lucide-react';
import { speakText } from '../services/speechService';
import { audioSynthesizer } from '../services/audioSynthesizer';
import { AppLanguage } from '../types/payment';

interface AudioStatusBarProps {
  lang: AppLanguage;
}

export const AudioStatusBar: React.FC<AudioStatusBarProps> = ({ lang }) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const handleTestAudio = () => {
    setIsPlayingTest(true);
    audioSynthesizer.playEarcon('safe');
    setTimeout(() => {
      speakText(
        lang === 'hi'
          ? "वॉयस गार्ड सक्रिय है। आपका ऑडियो असिस्टेंस तैयार है।"
          : "Voice Guard is active. Real-time audio assistance is ready.",
        lang,
        undefined,
        () => setIsPlayingTest(false)
      );
    }, 350);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-750 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Volume2 className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">Audio Assistive Shield</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Active Protection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Spoken transaction readouts & voice confirmation for blind and elderly accessibility
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestAudio}
            disabled={isPlayingTest}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            aria-label="Test assistive voice readout"
          >
            <Waves className={`w-3.5 h-3.5 text-sky-400 ${isPlayingTest ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{isPlayingTest ? 'Testing Voice...' : 'Test Speaker'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
