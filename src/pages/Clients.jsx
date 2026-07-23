import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Download, Search, Users, Briefcase, Wallet, Hourglass, CreditCard, X, FileText, Calendar, Edit2, Trash2, Check, Save } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  
  // Modals & Forms
  const [selectedClient, setSelectedClient] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [paymentForm, setPaymentForm] = useState({ amount: '', note: '' });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    clientName: '',
    service: '',
    totalAmount: '',
    initialPayment: '',
    paymentNote: '',
    remarks: '',
    clientInfoList: [{ key: '', value: '' }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  const clientsRef = collection(db, `userData/${userId}/clients`);

  const fetchClients = async () => {
    try {
      const q = query(clientsRef);
      const querySnapshot = await getDocs(q);
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      clientsData.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [userId]);

  const uniqueServices = useMemo(() => {
    const services = new Set(clients.map(c => c.service).filter(Boolean));
    return ['All Services', ...Array.from(services)].sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === 'All Services' || client.service === serviceFilter;
      return matchesSearch && matchesService;
    });
  }, [clients, searchTerm, serviceFilter]);

  const { totalBusinessValue, totalReceived, totalPending } = useMemo(() => {
    return filteredClients.reduce((acc, client) => {
      acc.totalBusinessValue += Number(client.totalAmount || 0);
      acc.totalReceived += Number(client.paidAmount || 0);
      acc.totalPending += Number(client.pendingAmount || 0);
      return acc;
    }, { totalBusinessValue: 0, totalReceived: 0, totalPending: 0 });
  }, [filteredClients]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'N/A';
  };

  // -------------------------
  // Handlers
  // -------------------------

  // Add Client
  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.clientName || !addForm.totalAmount) return;
    
    setIsSubmitting(true);
    try {
      const totalAmt = Number(addForm.totalAmount) || 0;
      const initialPaid = Number(addForm.initialPayment) || 0;
      const pending = totalAmt - initialPaid;

      // Process Key-Value pairs into an object or string
      const infoObj = {};
      addForm.clientInfoList.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          infoObj[item.key.trim()] = item.value.trim();
        }
      });
      // Convert to string for display, or store as object (we'll format it as string for consistency with existing data)
      const clientInfoString = Object.keys(infoObj).length > 0 
        ? Object.entries(infoObj).map(([k, v]) => `${k}: ${v}`).join('\n')
        : '';

      const newClient = {
        serial: clients.length > 0 ? Math.max(...clients.map(c => c.serial || 0)) + 1 : 1,
        clientName: addForm.clientName,
        service: addForm.service,
        totalAmount: totalAmt,
        paidAmount: initialPaid,
        pendingAmount: pending,
        remarks: addForm.remarks,
        clientInformation: infoObj,
        receivedPayments: initialPaid > 0 ? [{
          amount: initialPaid,
          note: addForm.paymentNote || 'Initial Payment',
          date: new Date().toISOString()
        }] : [],
        userID: userId,
        createdAt: serverTimestamp()
      };

      await addDoc(clientsRef, newClient);
      
      Swal.fire('Success', 'Client added successfully!', 'success');
      setShowAddModal(false);
      setAddForm({
        clientName: '', service: '', totalAmount: '', initialPayment: '', paymentNote: '', remarks: '', clientInfoList: [{ key: '', value: '' }]
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to add client.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInfoField = () => {
    setAddForm(prev => ({ ...prev, clientInfoList: [...prev.clientInfoList, { key: '', value: '' }] }));
  };
  const handleInfoChange = (index, field, val) => {
    const list = [...addForm.clientInfoList];
    list[index][field] = val;
    setAddForm(prev => ({ ...prev, clientInfoList: list }));
  };
  const handleRemoveInfoField = (index) => {
    const list = [...addForm.clientInfoList];
    list.splice(index, 1);
    setAddForm(prev => ({ ...prev, clientInfoList: list }));
  };

  // Edit Mode Handlers
  const startEditMode = () => {
    const infoObj = selectedClient.clientInformation || {};
    const infoList = Object.entries(infoObj).map(([key, value]) => ({ key, value }));
    if (infoList.length === 0) infoList.push({ key: '', value: '' });

    setEditForm({
      service: selectedClient.service || '',
      totalAmount: selectedClient.totalAmount || 0,
      remarks: selectedClient.remarks || '',
      clientInfoList: infoList
    });
    setEditMode(true);
  };

  const handleEditInfoChange = (index, field, val) => {
    const list = [...editForm.clientInfoList];
    list[index][field] = val;
    setEditForm(prev => ({ ...prev, clientInfoList: list }));
  };
  
  const handleAddEditInfoField = () => {
    setEditForm(prev => ({ ...prev, clientInfoList: [...prev.clientInfoList, { key: '', value: '' }] }));
  };

  const handleRemoveEditInfoField = (index) => {
    const list = [...editForm.clientInfoList];
    list.splice(index, 1);
    setEditForm(prev => ({ ...prev, clientInfoList: list }));
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      const newTotal = Number(editForm.totalAmount) || 0;
      const currentPaid = Number(selectedClient.paidAmount) || 0;
      const newPending = newTotal - currentPaid;

      const infoObj = {};
      editForm.clientInfoList.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          infoObj[item.key.trim()] = item.value.trim();
        }
      });

      const updates = {
        service: editForm.service,
        totalAmount: newTotal,
        pendingAmount: newPending,
        remarks: editForm.remarks,
        clientInformation: infoObj
      };

      const docRef = doc(db, `userData/${userId}/clients`, selectedClient.id);
      await updateDoc(docRef, updates);

      setSelectedClient(prev => ({ ...prev, ...updates }));
      
      // Update local list
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...updates } : c));
      
      setEditMode(false);
      Swal.fire({ icon: 'success', title: 'Saved', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to update client details', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Payment
  const handleAddPayment = async () => {
    const pAmt = Number(paymentForm.amount);
    if (!pAmt || pAmt <= 0) return;
    
    setIsSubmitting(true);
    try {
      const currentPaid = Number(selectedClient.paidAmount) || 0;
      const totalAmt = Number(selectedClient.totalAmount) || 0;
      
      const newPaid = currentPaid + pAmt;
      const newPending = totalAmt - newPaid;
      
      const newPaymentObj = {
        amount: pAmt,
        note: paymentForm.note || 'Payment',
        date: new Date().toISOString()
      };

      const updatedPayments = [...(selectedClient.receivedPayments || []), newPaymentObj];

      const docRef = doc(db, `userData/${userId}/clients`, selectedClient.id);
      await updateDoc(docRef, {
        paidAmount: newPaid,
        pendingAmount: newPending,
        receivedPayments: updatedPayments
      });

      const updates = { paidAmount: newPaid, pendingAmount: newPending, receivedPayments: updatedPayments };
      setSelectedClient(prev => ({ ...prev, ...updates }));
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...updates } : c));
      
      setPaymentForm({ amount: '', note: '' });
      Swal.fire({ icon: 'success', title: 'Payment Added', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to add payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Client
  const handleDeleteClient = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, `userData/${userId}/clients`, selectedClient.id));
          setClients(prev => prev.filter(c => c.id !== selectedClient.id));
          setSelectedClient(null);
          Swal.fire('Deleted!', 'The client has been deleted.', 'success');
        } catch (error) {
          Swal.fire('Error', 'Failed to delete client.', 'error');
        }
      }
    });
  };

  return (
    <div className="flex flex-col pb-10">
      <header className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-semibold text-black tracking-tight mb-6">Clients Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
          
          <select 
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/5 min-w-[160px]"
          >
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          <div className="relative flex-1 w-full sm:w-auto sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Total Clients</p>
            <h3 className="text-2xl font-bold text-zinc-900">{filteredClients.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Business Value</p>
            <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(totalBusinessValue)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-fuchsia-50 flex items-center justify-center text-fuchsia-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Total Received</p>
            <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(totalReceived)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Total Pending</p>
            <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(totalPending)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-zinc-50 border-b border-zinc-200/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-16">#</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-900 tracking-wider">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-900" /> Client
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-900 tracking-wider">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-zinc-900" /> Service
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-900 tracking-wider">
                    <div className="flex items-center gap-2 text-fuchsia-600">
                      <CreditCard className="w-4 h-4" /> Total
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-900 tracking-wider">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Wallet className="w-4 h-4" /> Received
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-900 tracking-wider">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Hourglass className="w-4 h-4" /> Pending
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80">
                {filteredClients.map((client, index) => (
                  <tr 
                    key={client.id} 
                    onClick={() => { setSelectedClient(client); setEditMode(false); }}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">
                      {client.clientName || 'Unnamed Client'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 whitespace-nowrap">
                      {client.service || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-fuchsia-600 whitespace-nowrap">
                      {formatCurrency(client.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(client.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-500 whitespace-nowrap">
                      {client.pendingAmount ? formatCurrency(client.pendingAmount) : '0'}
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-sm text-zinc-500">
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------- */}
      {/* ADD CLIENT MODAL                */}
      {/* ------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-xl font-bold text-zinc-900">Add New Client</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddClientSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Client Name *</label>
                  <input type="text" required value={addForm.clientName} onChange={e => setAddForm({...addForm, clientName: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Service</label>
                  <input type="text" value={addForm.service} onChange={e => setAddForm({...addForm, service: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm" placeholder="e.g. Happy Moves" list="service-suggestions" />
                  <datalist id="service-suggestions">
                    {uniqueServices.filter(s => s !== 'All Services').map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Total Amount (₹) *</label>
                  <input type="number" required value={addForm.totalAmount} onChange={e => setAddForm({...addForm, totalAmount: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Initial Payment (₹)</label>
                  <input type="number" value={addForm.initialPayment} onChange={e => setAddForm({...addForm, initialPayment: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm" placeholder="0" />
                </div>
              </div>
              
              {addForm.initialPayment > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Note</label>
                  <input type="text" value={addForm.paymentNote} onChange={e => setAddForm({...addForm, paymentNote: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm" placeholder="e.g. Advance via Wire" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Remarks</label>
                <textarea rows="3" value={addForm.remarks} onChange={e => setAddForm({...addForm, remarks: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none text-sm resize-none" placeholder="Add any notes here..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Extra Client Information (Optional)</label>
                <div className="space-y-3">
                  {addForm.clientInfoList.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input type="text" placeholder="Key (e.g. Email)" value={item.key} onChange={e => handleInfoChange(index, 'key', e.target.value)} className="flex-1 min-w-0 px-4 py-2 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                      <input type="text" placeholder="Value (e.g. foo@bar.com)" value={item.value} onChange={e => handleInfoChange(index, 'value', e.target.value)} className="flex-[2] min-w-0 px-4 py-2 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                      <button type="button" onClick={() => handleRemoveInfoField(index)} className="p-2 text-zinc-400 hover:text-red-500 rounded-xl border border-transparent hover:border-red-200 bg-zinc-50 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={handleAddInfoField} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
                    <Plus className="w-4 h-4" /> Add Field
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------- */}
      {/* CLIENT DETAILS MODAL            */}
      {/* ------------------------------- */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{selectedClient.clientName}</h2>
                  {!editMode ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider border border-blue-200/60">
                        <Briefcase className="w-3.5 h-3.5" /> {selectedClient.service || 'N/A'}
                      </span>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={editForm.service} 
                      onChange={e => setEditForm({...editForm, service: e.target.value})} 
                      className="mt-1 px-3 py-1 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" 
                      placeholder="Service name"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button onClick={startEditMode} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm text-zinc-700">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                    <Save className="w-4 h-4" /> Save
                  </button>
                )}
                <button onClick={() => { setSelectedClient(null); setEditMode(false); }} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 rounded-full transition-all focus:outline-none">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-8 overflow-y-auto bg-white flex-1 flex flex-col lg:flex-row gap-8">
              
              {/* Left Column: Financials & Payments */}
              <div className="flex-1 space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-zinc-400" /> Financial Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 relative z-10">Total Amount</p>
                      {!editMode ? (
                        <p className="text-2xl font-bold text-fuchsia-600 relative z-10">{formatCurrency(selectedClient.totalAmount || 0)}</p>
                      ) : (
                        <input 
                          type="number" 
                          value={editForm.totalAmount} 
                          onChange={e => setEditForm({...editForm, totalAmount: e.target.value})} 
                          className="w-full mt-1 px-3 py-1 text-lg font-bold text-fuchsia-600 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-fuchsia-500/20 bg-white/50 relative z-10" 
                        />
                      )}
                    </div>
                    
                    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 relative z-10">Received</p>
                      <p className="text-2xl font-bold text-emerald-600 relative z-10">{formatCurrency(selectedClient.paidAmount || 0)}</p>
                    </div>

                    <div className="col-span-2 bg-zinc-900 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1 relative z-10">Pending Balance</p>
                      <p className="text-3xl font-bold text-orange-400 relative z-10">
                        {editMode 
                          ? formatCurrency((Number(editForm.totalAmount) || 0) - (Number(selectedClient.paidAmount) || 0))
                          : (selectedClient.pendingAmount ? formatCurrency(selectedClient.pendingAmount) : '₹0')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" /> Payment History
                    </h3>
                  </div>

                  {/* Add Payment Form */}
                  <div className="mb-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-600 uppercase mb-3">Record New Payment</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="number" placeholder="Amount (₹)" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full sm:w-32 px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/5" />
                      <input type="text" placeholder="Note (e.g. Wire transfer)" value={paymentForm.note} onChange={e => setPaymentForm({...paymentForm, note: e.target.value})} className="w-full flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/5" />
                      <button onClick={handleAddPayment} disabled={isSubmitting || !paymentForm.amount} className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                        Add
                      </button>
                    </div>
                  </div>

                  {selectedClient.receivedPayments && selectedClient.receivedPayments.length > 0 ? (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {selectedClient.receivedPayments.slice().reverse().map((payment, idx) => (
                        <div key={idx} className="flex gap-4 items-start relative group">
                          <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 z-10 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors shadow-sm">
                            <CreditCard className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                          </div>
                          {idx !== selectedClient.receivedPayments.length - 1 && (
                            <div className="absolute top-10 left-5 bottom-[-1rem] w-px bg-zinc-100 z-0"></div>
                          )}
                          <div className="pt-1 bg-white p-3 rounded-xl border border-zinc-100 flex-1 shadow-sm">
                            <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                              <span className="text-emerald-600">{formatCurrency(payment.amount || 0)}</span>
                              <span className="text-zinc-300">•</span>
                              <span>{payment.note || 'Payment'}</span>
                            </p>
                            <p className="text-xs font-medium text-zinc-500 mt-0.5">{formatDate(payment.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-100 text-center">
                      <p className="text-sm text-zinc-500 italic">No payment history recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Info & Remarks */}
              <div className="w-full lg:w-[340px] flex-shrink-0 space-y-6 lg:border-l lg:border-zinc-100 lg:pl-8">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" /> Client Information
                  </h3>
                  {!editMode ? (
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
                      {selectedClient.clientInformation && Object.keys(selectedClient.clientInformation).length > 0 ? (
                        Object.entries(selectedClient.clientInformation).map(([key, val]) => (
                          <div key={key} className="flex flex-col gap-1 border-b border-zinc-100/50 pb-3 last:border-0 last:pb-0">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{key}</span>
                            <span className="text-sm font-medium text-zinc-900 leading-relaxed">{val}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-500 italic">No extra information provided.</span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      {editForm.clientInfoList && editForm.clientInfoList.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <input type="text" placeholder="Key" value={item.key} onChange={e => handleEditInfoChange(index, 'key', e.target.value)} className="flex-1 min-w-0 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-black/5" />
                          <input type="text" placeholder="Value" value={item.value} onChange={e => handleEditInfoChange(index, 'value', e.target.value)} className="flex-[2] min-w-0 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-black/5" />
                          <button type="button" onClick={() => handleRemoveEditInfoField(index)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddEditInfoField} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" /> Remarks
                  </h3>
                  {!editMode ? (
                    <div className="bg-white rounded-xl p-5 border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <p className="whitespace-pre-wrap text-sm font-medium text-zinc-900 leading-relaxed">
                        {selectedClient.remarks || 'No remarks added.'}
                      </p>
                    </div>
                  ) : (
                    <textarea 
                      rows="4" 
                      value={editForm.remarks} 
                      onChange={e => setEditForm({...editForm, remarks: e.target.value})}
                      className="w-full p-4 bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 resize-none"
                      placeholder="Enter remarks..."
                    />
                  )}
                </div>
                
                <div className="pt-8 mt-auto">
                  <button 
                    onClick={handleDeleteClient}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Client
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
