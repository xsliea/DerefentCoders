import React from 'react';
import { Shield, Languages, Eye, Type } from 'lucide-react';
import { AppLanguage } from '../types/payment';

interface HeaderProps {
  lang: AppLanguage;
  onToggleLang: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
  fontScaled: boolean;
  onToggleFontScale: () => void;
  currentPage?: 'app_home' | 'extension_page' | 'pin_page' | 'receipt_page' | 'blocked_page';
  onNavigatePage?: (page: 'app_home' | 'extension_page' | 'pin_page' | 'receipt_page' | 'blocked_page') => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  highContrast,
  onToggleContrast,
  fontScaled,
  onToggleFontScale,
  currentPage = 'app_home',
  onNavigatePage
}) => {
  return (
    <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md px-4 py-3.5 shadow-sm" role="banner">
      <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 ring-1 ring-white/10">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">VoiceGuard</span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                UPI Extension
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              Assistive Audio Verification & Scam Protection Layer
            </p>
          </div>
        </div>

        {/* Accessibility Quick Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1" role="toolbar" aria-label="Accessibility Settings">
          {/* Direct Page Jump Buttons */}
          {onNavigatePage && (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold mr-1">
              <button
                onClick={() => onNavigatePage('app_home')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  currentPage === 'app_home' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Dummy App
              </button>
              <button
                onClick={() => onNavigatePage('extension_page')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  currentPage === 'extension_page' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Extension Page
              </button>
              <button
                onClick={() => onNavigatePage('pin_page')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  currentPage === 'pin_page' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. PIN Entry
              </button>
            </div>
          )}

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            aria-label={`Language: ${lang === 'en' ? 'English' : 'Hindi'}. Click to switch.`}
          >
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'hi' ? 'हिंदी (HIN)' : 'English (ENG)'}</span>
          </button>

          {/* High Contrast Mode */}
          <button
            onClick={onToggleContrast}
            className={`p-2 rounded-xl border text-xs font-semibold transition active:scale-95 shadow-sm ${
              highContrast
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-amber-400'
            }`}
            title="Toggle High-Contrast (Yellow/Black)"
            aria-label="Toggle High Contrast Mode"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Large Font Toggle */}
          <button
            onClick={onToggleFontScale}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 shadow-sm flex items-center gap-1 ${
              fontScaled
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
            }`}
            title="Enlarge Text Size"
            aria-label="Increase Font Size"
          >
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold">{fontScaled ? '125%' : '100%'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
