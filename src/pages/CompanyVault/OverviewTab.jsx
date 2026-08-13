import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { Building2, Save, X, Edit2, Loader2 } from 'lucide-react';

export default function OverviewTab({ data, canEdit }) {
  const { companyId } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    legalName: data.legalName || '',
    brandName: data.brandName || '',
    companyType: data.companyType || 'Private Limited',
    dateOfIncorporation: data.dateOfIncorporation || '',
    website: data.website || '',
    industry: data.industry || ''
  });

  const handleSave = async () => {
    if (!companyId) return;
    setIsSaving(true);
    try {
      const detailsRef = doc(db, `userData/${companyId}/companyInfo`, 'details');
      // We merge so we don't overwrite addresses/contacts arrays
      await setDoc(detailsRef, formData, { merge: true });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving overview:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="w-5 h-5"/> Edit Company Overview</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg flex items-center gap-1">
              <X className="w-4 h-4"/> Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Save Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Legal Company Name</label>
            <input type="text" value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Brand / Trade Name</label>
            <input type="text" value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Company Type</label>
            <select value={formData.companyType} onChange={e => setFormData({...formData, companyType: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none">
              <option>Private Limited</option>
              <option>Public Limited</option>
              <option>LLP</option>
              <option>Partnership</option>
              <option>Sole Proprietorship</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Date of Incorporation</label>
            <input type="date" value={formData.dateOfIncorporation} onChange={e => setFormData({...formData, dateOfIncorporation: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Website URL</label>
            <input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none" placeholder="https://example.com" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Industry</label>
            <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none" />
          </div>
        </div>
      </div>
    );
  }

  const copyAllText = `Company Name: ${data.legalName || 'N/A'}\nBrand Name: ${data.brandName || 'N/A'}\nCompany Type: ${data.companyType || 'N/A'}\nWebsite: ${data.website || 'N/A'}`;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><Building2 className="w-5 h-5 text-blue-600"/> Company Overview</h2>
        <div className="flex gap-2">
          <CopyButton text={copyAllText} label="Copy All Details" />
          {canEdit && (
            <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-[12px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md flex items-center gap-1">
              <Edit2 className="w-3.5 h-3.5"/> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-6">
        <DetailItem label="Legal Company Name" value={data.legalName} />
        <DetailItem label="Brand / Trade Name" value={data.brandName} />
        <DetailItem label="Company Type" value={data.companyType} />
        <DetailItem label="Date of Incorporation" value={data.dateOfIncorporation ? new Date(data.dateOfIncorporation).toLocaleDateString() : ''} />
        <DetailItem label="Website" value={data.website} isLink />
        <DetailItem label="Industry" value={data.industry} />
      </div>
    </div>
  );
}

function DetailItem({ label, value, isLink }) {
  return (
    <div className="flex flex-col gap-1 border-b border-zinc-50 pb-3">
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center justify-between group">
        {value ? (
          <span className={`text-[14px] font-medium ${isLink ? 'text-blue-600 hover:underline cursor-pointer' : 'text-zinc-900'}`}>{value}</span>
        ) : (
          <span className="text-[13px] text-zinc-400 italic">Not specified</span>
        )}
        {value && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={value} label="" />
          </div>
        )}
      </div>
    </div>
  );
}
