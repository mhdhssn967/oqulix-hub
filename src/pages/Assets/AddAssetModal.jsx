import React, { useState } from 'react';
import { collection, doc, setDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function AddAssetModal({ isOpen, onClose, employees }) {
  const { companyId } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'Laptop',
    quantity: 1,
    boughtFrom: '',
    boughtOn: '',
    price: '',
    handledBy: '',
    status: 'Available',
    condition: 'New',
    conditionNote: '',
  });

  const [accessories, setAccessories] = useState(['']);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAccessoryChange = (index, value) => {
    const newAcc = [...accessories];
    newAcc[index] = value;
    setAccessories(newAcc);
  };

  const addAccessory = () => setAccessories([...accessories, '']);
  const removeAccessory = (index) => {
    const newAcc = [...accessories];
    newAcc.splice(index, 1);
    setAccessories(newAcc);
  };

  const generateAssetId = async () => {
    const coll = collection(db, `userData/${companyId}/assets`);
    const snapshot = await getCountFromServer(coll);
    const count = snapshot.data().count + 1;
    return `AST-${count.toString().padStart(4, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setError('');
    setIsSubmitting(true);

    try {
      const assetId = await generateAssetId();
      
      const filteredAccessories = accessories.filter(a => a.trim() !== '');
      
      let initialHistory = [];
      let finalStatus = formData.status;
      
      // If we are assigning immediately
      if (formData.handledBy) {
        finalStatus = 'Handed Over';
        initialHistory = [{
          date: new Date(),
          employee: formData.handledBy,
          action: 'Handed Over',
          condition: formData.condition,
          notes: 'Initial assignment'
        }];
      }

      const assetData = {
        id: assetId,
        name: formData.name,
        type: formData.type === 'Other' ? formData.otherType : formData.type,
        boughtFrom: formData.boughtFrom,
        boughtOn: formData.boughtOn ? new Date(formData.boughtOn) : null,
        quantity: parseInt(formData.quantity) || 1,
        price: parseFloat(formData.price) || 0,
        handledBy: formData.handledBy || null,
        status: finalStatus,
        condition: formData.condition,
        conditionNote: formData.conditionNote,
        accessories: filteredAccessories,
        history: initialHistory,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, `userData/${companyId}/assets`, assetId), assetData);
      
      onClose();
    } catch (err) {
      console.error("Error adding asset:", err);
      setError("Failed to add asset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
          <h2 className="text-[16px] font-semibold text-zinc-900">Add New Asset</h2>
          <button type="button" onClick={() => !isSubmitting && onClose()} className="text-zinc-400 hover:text-black transition-colors p-1 rounded-md hover:bg-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] font-medium flex items-start gap-2 border border-red-100 shrink-0">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Asset Name *</label>
              <input 
                type="text" required name="name" value={formData.name} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                placeholder="e.g. MacBook Pro M3"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Asset Type *</label>
              <select 
                required name="type" value={formData.type} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
              >
                <option value="Laptop">Laptop</option>
                <option value="Desktop">Desktop</option>
                <option value="Tablet">Tablet</option>
                <option value="Mobile Phone">Mobile Phone</option>
                <option value="VR Headset">VR Headset</option>
                <option value="VR Controller">VR Controller</option>
                <option value="VR Accessories">VR Accessories</option>
                <option value="Monitor">Monitor</option>
                <option value="Camera">Camera</option>
                <option value="Development Equipment">Development Equipment</option>
                <option value="Networking Equipment">Networking Equipment</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Facilities & Appliances">Facilities & Appliances (Fans, Lights, etc.)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {formData.type === 'Other' && (
              <div className="md:col-span-2">
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Specify Other Type *</label>
                <input 
                  type="text" required name="otherType" onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                  placeholder="Custom Type"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Bought From</label>
              <input 
                type="text" name="boughtFrom" value={formData.boughtFrom} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                placeholder="e.g. Amazon, Dell"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Bought On *</label>
              <input 
                type="date" required name="boughtOn" value={formData.boughtOn} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Quantity / Count *</label>
              <input 
                type="number" required min="1" step="1" name="quantity" value={formData.quantity} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Price (₹) *</label>
              <input 
                type="number" required min="0" step="0.01" name="price" value={formData.price} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Assign To Employee</label>
              <select 
                name="handledBy" value={formData.handledBy} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
              >
                <option value="">-- Leave Unassigned --</option>
                <option value="in_office">In Office</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Condition *</label>
              <select 
                required name="condition" value={formData.condition} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
              >
                <option value="New">New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Note</label>
              <input 
                type="text" name="conditionNote" value={formData.conditionNote} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                placeholder="Minor scratch on back, etc."
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Accessories</label>
            <div className="flex flex-col gap-2">
              {accessories.map((acc, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input 
                    type="text" value={acc} onChange={(e) => handleAccessoryChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                    placeholder={`Accessory ${index + 1} (e.g. Charging Cable)`}
                  />
                  <button type="button" onClick={() => removeAccessory(index)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addAccessory} className="flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 w-fit mt-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Accessory
              </button>
            </div>
          </div>
          
          {/* Action buttons pinned at bottom */}
          <div className="flex gap-3 pt-4 border-t border-zinc-100 mt-auto sticky bottom-0 bg-white z-10">
            <button type="button" onClick={() => !isSubmitting && onClose()} className="flex-1 py-2.5 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-2.5 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center shadow-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
