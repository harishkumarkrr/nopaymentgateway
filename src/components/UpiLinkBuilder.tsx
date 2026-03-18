import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onLinkGenerated: (link: string) => void;
}

export default function UpiLinkBuilder({ onLinkGenerated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!upiId) {
      return;
    }
    
    // Standard UPI deep link format:
    // upi://pay?pa=PA&pn=PN&am=AM&cu=INR&tn=TN
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      cu: 'INR',
    });
    
    if (amount) params.append('am', amount);
    if (note) params.append('tn', note);
    
    const link = `upi://pay?${params.toString()}`;
    onLinkGenerated(link);
  }, [upiId, payeeName, amount, note, onLinkGenerated]);

  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <span className="flex items-center gap-2">
          <LinkIcon size={16} />
          Build UPI Link
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {isOpen && (
        <div className="grid grid-cols-1 gap-4 pt-2">
          <input
            type="text"
            placeholder="UPI ID (e.g., name@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="text"
            placeholder="Payee Name"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="text"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
