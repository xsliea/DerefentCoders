import { AppLanguage } from '../types/payment';

// Number to Spoken Words Converter
export function numberToWords(num: number, lang: AppLanguage = 'en'): string {
  const amount = Number(num);
  if (isNaN(amount) || amount === 0) {
    return lang === 'hi' ? 'शून्य रुपये' : 'Zero Rupees';
  }

  if (lang === 'hi') {
    if (amount === 9900) return 'नौ हज़ार नौ सौ रुपये';
    if (amount === 4999) return 'चार हज़ार नौ सौ निन्यानवे रुपये';
    if (amount === 65) return 'पैंसठ रुपये';
    if (amount === 90) return 'नब्बे रुपये';
    if (amount === 500) return 'पाँच सौ रुपये';
    return `${Math.round(amount)} रुपये`;
  }

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number | string): string {
    const s = n.toString();
    if (s.length > 9) return 'overflow';
    const n_arr = ('000000000' + s).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_arr) return '';
    let str = '';
    str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[Number(n_arr[1][0])] + ' ' + a[Number(n_arr[1][1])]) + 'Crore ' : '';
    str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[Number(n_arr[2][0])] + ' ' + a[Number(n_arr[2][1])]) + 'Lakh ' : '';
    str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[Number(n_arr[3][0])] + ' ' + a[Number(n_arr[3][1])]) + 'Thousand ' : '';
    str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[Number(n_arr[4][0])] + ' ' + a[Number(n_arr[4][1])]) + 'Hundred ' : '';
    str += (Number(n_arr[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[Number(n_arr[5][0])] + ' ' + a[Number(n_arr[5][1])]) : '';
    return str.trim();
  }

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = inWords(intPart) + ' Rupees';
  if (decPart > 0) {
    result += ' and ' + inWords(decPart) + ' Paise';
  }
  return result;
}

// Text-to-Speech
export function speakText(text: string, lang: AppLanguage, onStart?: () => void, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis unsupported on this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (lang === 'hi') {
    const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('Hindi'));
    if (hiVoice) utterance.voice = hiVoice;
    utterance.lang = 'hi-IN';
  } else {
    const inVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
    if (inVoice) utterance.voice = inVoice;
    utterance.lang = 'en-IN';
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

// Request microphone permission proactively
export async function requestMicPermission(): Promise<boolean> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep track open or release it
      stream.getTracks().forEach(track => track.stop());
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Microphone access permission error:", err);
    return false;
  }
}

// Speech Recognition for Hands-Free Voice Commands
export function createSpeechRecognizer(
  lang: AppLanguage,
  onResult: (transcript: string) => void,
  onStart?: () => void,
  onEnd?: () => void
) {
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

  if (onStart) recognition.onstart = onStart;
  if (onEnd) recognition.onend = onEnd;

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript.trim()) {
      onResult(transcript.toLowerCase().trim());
    }
  };

  recognition.onerror = (e: any) => {
    console.warn("Speech recognition error:", e);
    // Don't kill listening on simple no-speech timeout
    if (e.error !== 'no-speech' && onEnd) {
      onEnd();
    }
  };

  return recognition;
}

