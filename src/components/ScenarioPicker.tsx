import React, { useState } from 'react';
import { AlertTriangle, ArrowDownLeft, Store, ShieldAlert, Sparkles } from 'lucide-react';
import { PaymentTransaction } from '../types/payment';

interface ScenarioPickerProps {
  onSelectScenario: (tx: PaymentTransaction) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ onSelectScenario }) => {
  const [activeId, setActiveId] = useState<string>('zero_trap');

  const scenarios = [
    {
      id: 'zero_trap',
      title: 'Amount Mismatch (Zero Trap)',
      tag: 'High Risk Attack',
      subtitle: 'Claimed ₹90 Discount • Encoded ₹9,900',
      description: 'Physical or digital QR falsely promises a ₹90 bill rebate, but covertly requests ₹9,900.00 from victim.',
      icon: AlertTriangle,
      color: 'red',
      tx: {
        vpa: 'electricity-fast-bill@okaxis',
        name: 'Quick Bill Payment Desk',
        amount: 9900.00,
        claimedAmount: 90.00,
        isVerifiedMerchant: false,
        isRefundScam: false
      } as PaymentTransaction
    },
    {
      id: 'refund_scam',
      title: 'Reverse Payment Scam',
      tag: 'Social Engineering',
      subtitle: 'Fake Customer Care Refund',
      description: 'Impersonates bank support claiming to "send" a ₹4,999 refund, but requests funds instead of crediting.',
      icon: ArrowDownLeft,
      color: 'amber',
      tx: {
        vpa: 'paytm-refund-desk-care@ybl',
        name: 'Customer Support Refund Unit',
        amount: 4999.00,
        claimedAmount: null,
        isVerifiedMerchant: false,
        isRefundScam: true
      } as PaymentTransaction
    },
    {
      id: 'safe_merchant',
      title: 'Verified Merchant Payment',
      tag: 'Clean Baseline',
      subtitle: 'Ramesh Kirana Store (₹65)',
      description: 'Authentic daily neighborhood grocery transaction with verified bank merchant accreditation.',
      icon: Store,
      color: 'emerald',
      tx: {
        vpa: 'ramesh.groceries@okhdfcbank',
        name: 'Ramesh Kirana Store',
        amount: 65.00,
        claimedAmount: 65.00,
        isVerifiedMerchant: true,
        isRefundScam: false
      } as PaymentTransaction
    }
  ];

  const handleSelect = (item: typeof scenarios[0]) => {
    setActiveId(item.id);
    onSelectScenario(item.tx);
  };

  return (
    <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400"></div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Interactive Test Simulation Cases
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">Click any preset to trigger real-time interception</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map(s => {
          const Icon = s.icon;
          const isSelected = activeId === s.id;
          const isRed = s.color === 'red';
          const isAmber = s.color === 'amber';

          return (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className={`relative text-left p-4 rounded-xl border transition-all duration-200 group flex flex-col justify-between ${
                isSelected
                  ? isRed
                    ? 'bg-red-950/40 border-red-500/80 shadow-md shadow-red-950/50 ring-1 ring-red-500/50'
                    : isAmber
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/50'
                    : 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                  : 'bg-slate-850/60 hover:bg-slate-800/80 border-slate-750/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isRed
                      ? 'text-red-400 bg-red-950/80 border-red-800/60'
                      : isAmber
                      ? 'text-amber-400 bg-amber-950/80 border-amber-800/60'
                      : 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
                  }`}>
                    {s.tag}
                  </span>
                  <div className={`p-1.5 rounded-lg ${
                    isRed
                      ? 'bg-red-500/10 text-red-400'
                      : isAmber
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-sm font-bold text-slate-100 group-hover:text-white">
                  {s.title}
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-0.5">
                  {s.subtitle}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                {s.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
