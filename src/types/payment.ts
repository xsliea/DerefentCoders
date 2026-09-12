export type RiskLevel = 'safe' | 'warning' | 'danger';
export type AppLanguage = 'en' | 'hi';

export interface RiskAnalysis {
  score: number;
  level: RiskLevel;
  flags: string[];
  explainerEn: string;
  explainerHi: string;
}

export interface PaymentTransaction {
  vpa: string;
  name: string;
  amount: number;
  claimedAmount?: number | null;
  isVerifiedMerchant: boolean;
  isRefundScam?: boolean;
  risk?: RiskAnalysis;
}

export type InputMode = 'scanner' | 'screenshot' | 'manual';
