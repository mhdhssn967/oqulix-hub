import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, label, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
        copied 
          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      } ${className}`}
      title={`Copy ${label || 'text'}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : (label || 'Copy')}
    </button>
  );
}
