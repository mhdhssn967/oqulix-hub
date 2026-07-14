import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { collection, query, getDocs, getDoc, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Receipt, Plus, Search, Check, X, Clock, FileText, Loader2, IndianRupee, Send, Calendar, User } from 'lucide-react';

export default function Reimbursements() {
  const { user, isAdmin, isManager, companyId, employeeData } = useAuthStore();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    segment: 'General',
    expenseType: '',
    otherExpenseType: '',
    coEmployees: '',
    clientName: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [segments, setSegments] = useState(['General']);
  const [employeesList, setEmployeesList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [clientSearchFocused, setClientSearchFocused] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      try {
        const [reimbSnapshot, segSnapshot, empSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'userData', companyId, 'reimbursements'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'userData', companyId, 'segments')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'userData', companyId, 'employees')).catch(() => ({ docs: [] }))
        ]);

        let data = reimbSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!isAdmin && !isManager) {
          data = data.filter(item => item.employeeUid === user?.uid);
        }

        setReimbursements(data);

        const fetchedSegments = segSnapshot.docs.map(doc => doc.id);
        const uniqueSegments = Array.from(new Set(['General', 'happymoves', 'gamefaktory', ...fetchedSegments]));
        setSegments(uniqueSegments);

        const fetchedEmployees = empSnapshot.docs.map(doc => doc.data().name).filter(Boolean);
        setEmployeesList(fetchedEmployees);

        // Fetch clients from segments/General/crmData/allClients to bypass any rule restrictions
        try {
          const clientsDoc = await getDoc(doc(db, 'userData', companyId, 'segments', 'General', 'crmData', 'allClients'));
          if (clientsDoc.exists()) {
            const allClients = clientsDoc.data().clients || [];
            setClientsList(allClients.map(c => c.formattedString || `${c.clientName} (${c.associateName})`).sort());
          } else {
            console.log("segments/General/crmData/allClients doc does not exist.");
            setClientsList(["ERROR: Document does not exist at paths"]);
          }
        } catch (e) {
          console.error("Error fetching global clients list:", e);
          setClientsList(["ERROR: " + e.message]);
        }
      } catch (err) {
        console.error("Error fetching reimbursements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, isAdmin, isManager, user?.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !user) return;
    setIsSubmitting(true);
    
    try {
      const newEntry = {
        ...formData,
        amount: Number(formData.amount),
        employeeUid: user.uid,
        employeeName: employeeData?.name || user.displayName || user.email || 'Unknown',
        status: 'Pending', 
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'userData', companyId, 'reimbursements'), newEntry);
      
      setReimbursements([{ id: docRef.id, ...newEntry, createdAt: { seconds: Date.now() / 1000 } }, ...reimbursements]);
      setIsModalOpen(false);
      setFormData({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        segment: 'General',
        expenseType: '',
        otherExpenseType: '',
        coEmployees: '',
        clientName: ''
      });
      setActiveTab('Pending');
    } catch (err) {
      console.error("Error submitting reimbursement:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!companyId || (!isAdmin && !isManager)) return;
    try {
      await updateDoc(doc(db, 'userData', companyId, 'reimbursements', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      setReimbursements(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ));
    } catch (err) {
      console.error("Error updating reimbursement status:", err);
    }
  };

  const filteredReimbursements = reimbursements.filter(item => {
    const matchesSearch = (item.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (item.employeeName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Tab filtering: 'Pending' or 'Sent' (which includes Approved & Sent, and potentially Rejected if we want to show it there)
    const matchesTab = activeTab === 'Pending' ? item.status === 'Pending' : item.status !== 'Pending';
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status) => {
    if (status === 'Approved & Sent') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 text-xs font-semibold"><Send className="w-3 h-3" /> Approved & Sent</span>;
    if (status === 'Rejected') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 ring-1 ring-red-600/20 text-xs font-semibold"><X className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 text-xs font-semibold"><Clock className="w-3 h-3" /> Pending</span>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <header className="mb-6 flex-shrink-0 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight flex items-center gap-2">
            <Receipt className="w-8 h-8 text-black" />
            Reimbursements
          </h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">
            {isAdmin || isManager ? 'Review and manage employee reimbursement requests.' : 'Submit and track your expense reimbursements.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          File Reimbursement
        </button>
      </header>

      {/* Custom Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200/80 mb-6 flex-shrink-0">
        {['Pending', 'Sent'].map(tab => {
          const count = reimbursements.filter(item => tab === 'Pending' ? item.status === 'Pending' : item.status !== 'Pending').length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14px] font-medium transition-all relative ${
                activeTab === tab ? 'text-black' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab}
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                  activeTab === tab ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {count}
                </span>
              </span>
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black rounded-t-full"></span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="mb-4 relative w-full sm:w-80 flex-shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()} reimbursements...`} 
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-lg text-[13px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          />
        </div>

        <div className="flex-1 overflow-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : filteredReimbursements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8 text-center bg-white border border-zinc-200/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <Receipt className="w-12 h-12 mb-3 text-zinc-200" />
              <p className="font-medium text-zinc-600">No {activeTab.toLowerCase()} reimbursements found</p>
              {activeTab === 'Pending' && <p className="text-sm mt-1">Submit a new request to get started.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
              {filteredReimbursements.map(item => (
                <div key={item.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow flex flex-col relative group">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[15px] font-bold text-zinc-900">{item.title}</h3>
                      <div className="text-[12px] font-medium text-zinc-500 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {item.employeeName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-bold text-zinc-900">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md text-[11px] font-medium border border-zinc-200">
                        {item.segment || 'General'}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[11px] font-medium border border-blue-200">
                        {item.expenseType === 'Other' ? item.otherExpenseType : item.expenseType}
                      </span>
                    </div>

                    {item.coEmployees && (
                      <div className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        With: {item.coEmployees}
                      </div>
                    )}

                    {item.clientName && (
                      <div className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        Client: <span className="font-medium text-zinc-700">{item.clientName}</span>
                      </div>
                    )}

                    {item.description && (
                      <div className="text-[13px] text-zinc-600 line-clamp-3 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-[12px] font-medium text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    {/* Actions for Admins/Managers on Pending items */}
                    {(isAdmin || isManager) && item.status === 'Pending' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleUpdateStatus(item.id, 'Approved & Sent')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 text-[12px] font-semibold flex items-center gap-1.5"
                          title="Approve & Send Payment"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Approve & Send
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(item.id, 'Rejected')}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-[16px] font-semibold text-zinc-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-zinc-500" />
                File Reimbursement
              </h2>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="text-zinc-400 hover:text-black transition-colors rounded-lg p-1 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div>
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Expense Title *</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px]"
                  placeholder="e.g. Client Lunch, Travel Tickets"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Amount (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Date incurred *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Segment *</label>
                  <select 
                    required
                    value={formData.segment}
                    onChange={(e) => setFormData({...formData, segment: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] cursor-pointer"
                  >
                    {segments.map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Expense Type *</label>
                  <select 
                    required
                    value={formData.expenseType}
                    onChange={(e) => setFormData({...formData, expenseType: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] cursor-pointer"
                  >
                    <option value="" disabled>Select type...</option>
                    {['Travel', 'Client Meeting', 'Installation', 'Training', 'Office Expense', 'Company Expense', 'Purchases', 'Company Utilities', 'Recharge', 'Promotions & Ad', 'Other'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.expenseType === 'Other' && (
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Specify Other Expense *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.otherExpenseType}
                    onChange={(e) => setFormData({...formData, otherExpenseType: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px]"
                    placeholder="Describe the expense..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Co-Employee (Optional)</label>
                  <select 
                    value={formData.coEmployees}
                    onChange={(e) => setFormData({...formData, coEmployees: e.target.value})}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] cursor-pointer"
                  >
                    <option value="">None</option>
                    {employeesList.map(emp => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Client Details (Optional)</label>
                  <input 
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    onFocus={() => setClientSearchFocused(true)}
                    onBlur={() => setTimeout(() => setClientSearchFocused(false), 200)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px]"
                    placeholder={`Search from ${clientsList.length} clients...`}
                    autoComplete="off"
                  />
                  {clientSearchFocused && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto no-scrollbar">
                      {clientsList.length === 0 ? (
                        <div className="px-3 py-2 text-[13px] text-zinc-500 italic">No clients loaded yet...</div>
                      ) : clientsList.filter(c => c.toLowerCase().includes((formData.clientName || '').toLowerCase())).length > 0 ? (
                        clientsList.filter(c => c.toLowerCase().includes((formData.clientName || '').toLowerCase())).slice(0, 30).map((client, idx) => (
                          <div 
                            key={`${client}-${idx}`}
                            className="px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 cursor-pointer border-b border-zinc-100 last:border-0"
                            onMouseDown={() => setFormData({...formData, clientName: client})}
                          >
                            {client}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[13px] text-zinc-500 italic">No matching clients found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] resize-none"
                  placeholder="Additional details about this expense..."
                />
              </div>

              <div className="mt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
