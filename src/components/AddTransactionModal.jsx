import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AddTransactionModal({ isOpen, onClose, preferences, onSuccess, transactionToEdit }) {
  const [tab, setTab] = useState('debit'); // 'debit' | 'credit'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '',
    service: '',
    type: '',
    category: '',
    amount: '',
    remarks: '',
    creditType: 'revenue'
  });

  useEffect(() => {
    if (transactionToEdit) {
      const isExpense = transactionToEdit.isExpense || (!transactionToEdit.isRevenue && transactionToEdit.typeOfTransaction !== "Income" && transactionToEdit.creditType !== "revenue");
      const isRevenue = transactionToEdit.isRevenue && transactionToEdit.creditType === "revenue";
      
      setTab(isExpense ? 'debit' : 'credit');
      setFormData({
        date: transactionToEdit.date || new Date().toISOString().split('T')[0],
        source: transactionToEdit.source || '',
        service: transactionToEdit.service || '',
        type: transactionToEdit.typeOfTransaction || '',
        category: transactionToEdit.category || '',
        amount: transactionToEdit.amount || '',
        remarks: transactionToEdit.remarks || '',
        creditType: transactionToEdit.creditType || (isRevenue ? 'revenue' : 'credit')
      });
    } else {
      setTab('debit');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        source: '',
        service: '',
        type: '',
        category: '',
        amount: '',
        remarks: '',
        creditType: 'revenue'
      });
    }
  }, [transactionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
      let payload = {};

      if (tab === 'debit') {
        payload = {
          isExpense: true,
          isRevenue: false,
          date: formData.date,
          source: formData.source,
          service: formData.service,
          typeOfTransaction: formData.type,
          category: formData.category,
          amount: Number(formData.amount),
          remarks: formData.remarks
        };
      } else {
        payload = {
          isExpense: false,
          isRevenue: true,
          creditType: formData.creditType,
          date: formData.date,
          service: formData.service,
          amount: Number(formData.amount),
          remarks: formData.remarks
        };
      }

      if (transactionToEdit) {
        await updateDoc(doc(db, `userData/${userId}/financialData`, transactionToEdit.id), payload);
      } else {
        await addDoc(collection(db, `userData/${userId}/financialData`), payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Error saving transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-zinc-900">{transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex bg-zinc-100/80 p-1 rounded-xl mb-6">
            <button
              onClick={() => setTab('debit')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'debit' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Debit (Expense)
            </button>
            <button
              onClick={() => setTab('credit')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'credit' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Credit (Revenue/Fund)
            </button>
          </div>

          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Date</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
              />
            </div>

            {tab === 'debit' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Source</label>
                    <select
                      name="source"
                      required
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="">Select Source</option>
                      {preferences?.source?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Service</label>
                    <select
                      name="service"
                      required
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="">Select Service</option>
                      {preferences?.service?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Type</label>
                    <select
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="">Select Type</option>
                      {preferences?.type?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
                    <select
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="">Select Category</option>
                      {preferences?.category?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {tab === 'credit' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Service</label>
                    <select
                      name="service"
                      required
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="">Select Service</option>
                      {preferences?.service?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Credit Type</label>
                    <select
                      name="creditType"
                      required
                      value={formData.creditType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="credit">Credit (Funds)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full pl-7 pr-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Remarks</label>
              <textarea
                name="remarks"
                required
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 sm:text-sm resize-none"
                placeholder="Enter remarks or description..."
              />
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            form="transaction-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-xl hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/5 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {loading ? (transactionToEdit ? 'Saving...' : 'Adding...') : (transactionToEdit ? 'Save Changes' : 'Add Transaction')}
          </button>
        </div>
      </div>
    </div>
  );
}
