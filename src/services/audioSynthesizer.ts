import { RiskLevel } from '../types/payment';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playEarcon(type: RiskLevel): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (type === 'safe') {
        // Pleasant ascending harmonious chime (C5 -> G5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(783.99, now + 0.15); // G5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);

        if ('vibrate' in navigator) navigator.vibrate([60]);
      } else if (type === 'danger') {
        // Urgent multi-tone buzzer alert (sawtooth tone)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(160, now + 0.12);
        osc.frequency.setValueAtTime(260, now + 0.24);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // Urgent alternating danger haptics
        if ('vibrate' in navigator) navigator.vibrate([180, 80, 180, 80, 250]);
      } else if (type === 'warning') {
        // Attention alert tone (triangle wave)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(370, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        if ('vibrate' in navigator) navigator.vibrate([120, 50, 120]);
      }
    } catch (e) {
      console.warn("Audio Context interaction pending user gesture:", e);
    }
  }
}

export const audioSynthesizer = new AudioSynthesizer();
