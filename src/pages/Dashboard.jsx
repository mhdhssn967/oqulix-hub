import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, Calendar, User, Building2, MapPin, Target, AlertCircle, X, DollarSign, Briefcase, Hash, Clock, FileText, CheckCircle, Tag, Globe, MessageSquare, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';

const Pagination = ({ totalItems, currentPage, setCurrentPage, itemsPerPage }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-white">
      <div className="text-[13px] text-zinc-500">
        Showing <span className="font-medium text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-medium text-zinc-900">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[13px] font-medium text-zinc-700">
          Page {currentPage} of {totalPages}
        </div>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('regular');
  const [regularLeads, setRegularLeads] = useState([]);
  const [adLeads, setAdLeads] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const { user, isAdmin, companyId, employeeData } = useAuthStore();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showIrregularPhonesOnly, setShowIrregularPhonesOnly] = useState(false);

  // Add Lead Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    institutionName: '',
    contactNo: '',
    place: '',
    leadType: 'Clinic',
    customLeadType: '',
    assignedToName: '',
    priority: 'Medium',
    followUpDate: '',
    message: '',
    remarks: ''
  });

  // Auto-fill assignedToName for employees when modal opens
  useEffect(() => {
    if (isModalOpen && !isAdmin && employeeData) {
      setFormData(prev => ({ ...prev, assignedToName: employeeData.name }));
    }
  }, [isModalOpen, isAdmin, employeeData]);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const finalLeadType = formData.leadType === 'Other' ? formData.customLeadType : formData.leadType;
      
      const leadPayload = {
        name: formData.name,
        institutionName: formData.institutionName,
        contactNo: formData.contactNo,
        region: formData.place,
        place: formData.place,
        leadType: finalLeadType,
        assignedToName: formData.assignedToName,
        priority: formData.priority,
        followUpDate: formData.followUpDate,
        message: formData.message,
        remarks: formData.remarks,
        updatedAt: new Date()
      };

      const docRef = doc(db, 'userData', companyId, 'crmData', 'leads');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        let items = snap.data().items || [];
        
        if (editingLeadId) {
          items = items.map(item => item.id === editingLeadId ? { ...item, ...leadPayload } : item);
        } else {
          const newLead = {
            ...leadPayload,
            id: doc(collection(db, 'temp')).id,
            currentStatus: 'New Lead',
            newLead: true,
            employeeName: isAdmin ? 'Admin' : (employeeData?.name || 'Employee'),
            addedByName: isAdmin ? 'Admin' : (employeeData?.name || 'Employee'),
            userId: user.uid,
            assignedToUid: user.uid,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date(),
          };
          items = [newLead, ...items];
        }
        
        await updateDoc(docRef, { items });
        const fetchedLeads = !isAdmin && user?.uid ? items.filter(item => item.userId === user.uid) : items;
        setRegularLeads(fetchedLeads);
      }
      
      setIsModalOpen(false);
      setEditingLeadId(null);
      setFormData({ 
        name: '', institutionName: '', contactNo: '', place: '', 
        leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), 
        priority: 'Medium', followUpDate: '', message: '', remarks: '' 
      });
    } catch (err) {
      console.error("Error saving lead:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (lead) => {
    setFormData({
      name: lead.name || lead.clientName || '',
      institutionName: lead.institutionName || '',
      contactNo: lead.contactNo || '',
      place: lead.place || lead.region || '',
      leadType: ['Clinic', 'Physiotherapist', 'Distributor'].includes(lead.leadType) ? lead.leadType : 'Other',
      customLeadType: ['Clinic', 'Physiotherapist', 'Distributor'].includes(lead.leadType) ? '' : (lead.leadType || ''),
      assignedToName: lead.assignedToName || '',
      priority: lead.priority || 'Medium',
      followUpDate: lead.followUpDate || '',
      message: lead.message || '',
      remarks: lead.remarks || ''
    });
    setEditingLeadId(lead.id);
    setSelectedLead(null);
    setIsModalOpen(true);
  };

  const handleDeleteLead = async (lead) => {
    if (!window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;
    
    let collectionName = 'leads';
    if (activeTab === 'ads') collectionName = 'adLeads';
    if (activeTab === 'distributors') collectionName = 'distributors';
    
    try {
      const docRef = doc(db, 'userData', companyId, 'crmData', collectionName);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const items = snap.data().items || [];
        const newItems = items.filter(item => item.id !== lead.id);
        await updateDoc(docRef, { items: newItems });
        
        const fetchedItems = !isAdmin && user?.uid ? newItems.filter(item => item.userId === user.uid) : newItems;
        if (activeTab === 'regular') setRegularLeads(fetchedItems);
        if (activeTab === 'ads') setAdLeads(fetchedItems);
        if (activeTab === 'distributors') setDistributors(fetchedItems);
        
        setSelectedLead(null);
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setStatusFilter('');
    setEmployeeFilter('');
    setMonthFilter('');
  }, [activeTab]);

  useEffect(() => {
    const fetchCRMData = async () => {
      if (!companyId) return;
      try {
        const leadsDocRef = doc(db, 'userData', companyId, 'crmData', 'leads');
        const adLeadsDocRef = doc(db, 'userData', companyId, 'crmData', 'adLeads');
        const distributorsDocRef = doc(db, 'userData', companyId, 'crmData', 'distributors');
        
        const [leadsSnap, adLeadsSnap, distributorsSnap] = await Promise.all([
          getDoc(leadsDocRef),
          getDoc(adLeadsDocRef),
          getDoc(distributorsDocRef)
        ]);
        
        let fetchedLeads = leadsSnap.exists() ? (leadsSnap.data().items || []) : [];
        let fetchedAdLeads = adLeadsSnap.exists() ? (adLeadsSnap.data().items || []) : [];
        let fetchedDistributors = distributorsSnap.exists() ? (distributorsSnap.data().items || []) : [];

        if (!isAdmin && user?.uid) {
          fetchedLeads = fetchedLeads.filter(item => item.userId === user.uid);
          fetchedAdLeads = fetchedAdLeads.filter(item => item.userId === user.uid);
          fetchedDistributors = fetchedDistributors.filter(item => item.userId === user.uid);
        }
        
        setRegularLeads(fetchedLeads);
        setAdLeads(fetchedAdLeads);
        setDistributors(fetchedDistributors);
        
      } catch (error) {
        console.error("Error fetching CRM data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCRMData();
  }, [companyId, isAdmin, user?.uid]);

  const getIconForKey = (key) => {
    const k = key.toLowerCase();
    if (k.includes('name') || k.includes('client') || k.includes('institution')) return <Building2 className="w-4 h-4" />;
    if (k.includes('contact') || k.includes('person')) return <User className="w-4 h-4" />;
    if (k.includes('phone') || k.includes('number') || k.includes('contactno')) return <Phone className="w-4 h-4" />;
    if (k.includes('email')) return <Mail className="w-4 h-4" />;
    if (k.includes('place') || k.includes('country') || k.includes('region') || k.includes('address') || k.includes('state')) return <MapPin className="w-4 h-4" />;
    if (k.includes('price') || k.includes('value')) return <DollarSign className="w-4 h-4" />;
    if (k.includes('date') || k.includes('followup') || k.includes('time')) return <Calendar className="w-4 h-4" />;
    if (k.includes('status')) return <CheckCircle className="w-4 h-4" />;
    if (k.includes('priority')) return <AlertCircle className="w-4 h-4" />;
    if (k.includes('designation') || k.includes('role')) return <Briefcase className="w-4 h-4" />;
    if (k.includes('remarks') || k.includes('message')) return <MessageSquare className="w-4 h-4" />;
    if (k.includes('type')) return <Tag className="w-4 h-4" />;
    if (k.includes('id')) return <Hash className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-zinc-50 text-zinc-600 ring-zinc-500/10';
    const s = status.toLowerCase();
    
    if (s.includes('lost') || s.includes('fail') || s.includes('cancel')) return 'bg-red-50 text-red-700 ring-red-600/10';
    if (s.includes('won') || s.includes('success') || s.includes('converted')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
    if (s.includes('progress') || s.includes('contacted') || s.includes('discuss')) return 'bg-blue-50 text-blue-700 ring-blue-600/10';
    if (s.includes('meeting') || s.includes('schedule') || s.includes('appoint')) return 'bg-purple-50 text-purple-700 ring-purple-600/10';
    if (s.includes('active') || s.includes('onboard')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
    if (s.includes('new') || s.includes('lead')) return 'bg-sky-50 text-sky-700 ring-sky-600/10';
    
    return 'bg-amber-50 text-amber-700 ring-amber-600/10';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Urgent') return 'text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md text-[11px] font-semibold';
    return 'text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded-md text-[11px] font-semibold';
  };

  const currentData = activeTab === 'regular' ? regularLeads : activeTab === 'ads' ? adLeads : distributors;

  const uniqueStatuses = [...new Set(currentData.map(item => item.currentStatus || 'N/A'))].filter(Boolean).sort();
  const uniqueEmployees = [...new Set(currentData.map(item => item.employeeName || item.assignedToName || item.addedByName || 'N/A'))].filter(Boolean).sort();
  const uniqueMonths = [...new Set(currentData.map(item => {
    if (!item.date && !item.createdAt) return 'N/A';
    const itemDate = new Date(item.date || (item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt));
    if (isNaN(itemDate)) return 'N/A';
    return itemDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }))].filter(m => m !== 'N/A').sort((a, b) => new Date(b) - new Date(a));

  const isIrregularPhone = (phone) => {
    if (!phone) return true;
    const digitsOnly = phone.toString().replace(/\D/g, '');
    if (digitsOnly.length < 7) return true;
    if (/^(\d)\1+$/.test(digitsOnly)) return true;
    if ('01234567890123456789'.includes(digitsOnly) || '98765432109876543210'.includes(digitsOnly)) return true;
    return false;
  };

  const getFilteredData = (data, ignoreStatus = false) => {
    return data.filter(item => {
      const searchString = Object.values(item).filter(v => typeof v !== 'object').join(' ').toLowerCase();
      const matchesSearch = searchQuery === '' || searchString.includes(searchQuery.toLowerCase());
      
      const status = item.currentStatus || 'N/A';
      const matchesStatus = ignoreStatus || statusFilter === '' || status === statusFilter;
      
      const employee = item.employeeName || item.assignedToName || item.addedByName || 'N/A';
      const matchesEmployee = employeeFilter === '' || employee === employeeFilter;
      
      const itemDate = new Date(item.date || (item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt));
      const monthStr = isNaN(itemDate) ? 'N/A' : itemDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      const matchesMonth = monthFilter === '' || monthStr === monthFilter;
      
      const phone = item.contactNo || item.contactNumber || '';
      const matchesIrregular = showIrregularPhonesOnly ? isIrregularPhone(phone) : true;
      
      return matchesSearch && matchesStatus && matchesEmployee && matchesMonth && matchesIrregular;
    });
  };

  const dataFilteredByOtherThanStatus = getFilteredData(currentData, true);
  
  const statusCounts = {};
  dataFilteredByOtherThanStatus.forEach(item => {
    const status = item.currentStatus || 'N/A';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const filteredRegularLeads = getFilteredData(regularLeads);
  const filteredAdLeads = getFilteredData(adLeads);
  const filteredDistributors = getFilteredData(distributors);

  return (
    <div className="flex flex-col h-full">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">CRM Pipeline</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Manage your leads, ad campaigns, and distributors.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black hover:bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium text-[13px] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Custom Tabs */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { id: 'regular', label: 'Regular Leads', count: regularLeads.length },
          { id: 'ads', label: 'Ad Leads', count: adLeads.length },
          { id: 'distributors', label: 'Distributors', count: distributors.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[14px] font-medium transition-all relative ${
              activeTab === tab.id ? 'text-black' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === tab.id ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button 
          onClick={() => {
            setStatusFilter('');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all bg-zinc-100 text-zinc-700 ${statusFilter === '' ? 'ring-2 ring-offset-1 ring-black/20 opacity-100' : 'opacity-70 hover:opacity-100'}`}
        >
          All
          <span className="bg-black/10 text-black/70 px-1.5 py-0.5 rounded-md text-[10px] ml-1 font-bold">{dataFilteredByOtherThanStatus.length}</span>
        </button>
        {uniqueStatuses.map(status => (
          <button 
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? '' : status);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all ${getStatusColor(status)} ${statusFilter === status ? 'ring-2 ring-offset-1 ring-black/20 opacity-100' : 'opacity-70 hover:opacity-100'}`}
          >
            {status}
            <span className="bg-white/60 text-black/70 px-1.5 py-0.5 rounded-md text-[10px] ml-1 font-bold">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex-1 flex flex-col">
        
        {/* Search & Filters */}
        <div className="p-4 border-b border-zinc-100 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={`Search ${activeTab} data...`} 
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-lg text-[13px] transition-all"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-48">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-lg text-[13px] transition-all appearance-none cursor-pointer text-zinc-700"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div className="relative w-full sm:w-48">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select 
                value={employeeFilter}
                onChange={(e) => { setEmployeeFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-lg text-[13px] transition-all appearance-none cursor-pointer text-zinc-700"
              >
                <option value="">All Associates</option>
                {uniqueEmployees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-48">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select 
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-lg text-[13px] transition-all appearance-none cursor-pointer text-zinc-700"
              >
                <option value="">All Months</option>
                {uniqueMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => { setShowIrregularPhonesOnly(!showIrregularPhonesOnly); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all border flex items-center gap-2 whitespace-nowrap ${
                showIrregularPhonesOnly 
                  ? 'bg-amber-100 border-amber-200 text-amber-800' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Show leads with short, repeating, or blank phone numbers"
            >
              <AlertCircle className="w-4 h-4" />
              {showIrregularPhonesOnly ? 'Irregular Phones' : 'Irregular Phones'}
            </button>
          </div>
        </div>

        {/* Regular Leads View */}
        {activeTab === 'regular' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Added Date</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Place</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Person of Contact</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Contact No</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Associate</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Next Follow Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRegularLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead, index) => {
                  const leadDate = new Date(lead.date || (lead.createdAt?.seconds ? lead.createdAt.seconds * 1000 : lead.createdAt));
                  const dateString = isNaN(leadDate) ? 'N/A' : leadDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-5 py-4 text-[13px] text-zinc-500">{dateString}</td>
                    <td className="px-5 py-4 text-[13px] font-medium text-zinc-900">{lead.clientName || lead.name || 'N/A'}</td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600">{lead.place || 'N/A'}</td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600">{lead.personOfContact || 'N/A'}</td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600">{lead.contactNo || 'N/A'}</td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600">{lead.employeeName || 'N/A'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium ring-1 ring-inset ${getStatusColor(lead.currentStatus)}`}>
                        {lead.currentStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600 text-right">{lead.nextFollowUp || 'N/A'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination totalItems={filteredRegularLeads.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
          </div>
        )}

        {/* Ad Leads View */}
        {activeTab === 'ads' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Lead Info</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Institution & Region</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider max-w-xs">Message</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status & Agent</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAdLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead, index) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-black text-[14px] flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        {lead.name}
                      </div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {lead.contactNumber}
                      </div>
                      <div className="mt-1.5">
                        <span className={getPriorityColor(lead.priority)}>
                          {lead.priority === 'Urgent' && <AlertCircle className="w-3 h-3" />}
                          {lead.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-medium text-zinc-900">{lead.institutionName}</div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lead.region}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-[12px] text-zinc-600 line-clamp-2" title={lead.message}>
                        "{lead.message}"
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">Type: {lead.leadType}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium ring-1 ring-inset ${getStatusColor(lead.currentStatus)}`}>
                        {lead.currentStatus}
                      </span>
                      <div className="text-[12px] text-zinc-500 mt-1">
                        Rep: <span className="font-medium text-zinc-700">{lead.assignedToName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination totalItems={filteredAdLeads.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
          </div>
        )}

        {/* Distributors View */}
        {activeTab === 'distributors' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Distributor</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Contact Person</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Performance</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDistributors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dist, index) => (
                  <tr key={dist.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedLead(dist)}>
                    <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-black text-[14px] flex items-center gap-2">
                        <Target className="w-4 h-4 text-zinc-400" />
                        {dist.distributorName || 'N/A'}
                      </div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {dist.region || dist.state || 'N/A'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-medium text-zinc-900">{dist.contactPersonName || 'N/A'}</div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {dist.contactNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-[20px] font-light text-black">{dist.onboardedClients || 0}</div>
                        <div className="text-[11px] text-zinc-500 leading-tight">Clients<br/>Onboarded</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium ring-1 ring-inset ${getStatusColor(dist.currentStatus)}`}>
                        {dist.currentStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination totalItems={filteredDistributors.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
          </div>
        )}
      </div>
        </>
      )}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 sm:p-8 flex items-start justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 opacity-10 pointer-events-none">
                <Target className="w-64 h-64 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md">
                    Lead Profile
                  </span>
                  {selectedLead.currentStatus && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border border-emerald-500/30">
                      {selectedLead.currentStatus}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {selectedLead.clientName || selectedLead.name || selectedLead.distributorName || 'Unknown Lead'}
                </h2>
                {(selectedLead.place || selectedLead.region) && (
                  <p className="text-zinc-400 mt-2 flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4" />
                    {selectedLead.place || selectedLead.region} {selectedLead.country ? `, ${selectedLead.country}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 relative z-10">
                {activeTab === 'regular' && (
                  <button 
                    onClick={() => openEditModal(selectedLead)}
                    className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full px-4 py-2 text-[12px] font-medium flex items-center gap-1.5"
                  >
                    Edit
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteLead(selectedLead)}
                  className="text-red-400 hover:text-white hover:bg-red-500/20 transition-colors bg-white/5 rounded-full px-4 py-2 text-[12px] font-medium flex items-center gap-1.5"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {Object.entries(selectedLead)
                  .filter(([k,v]) => {
                    const ignoredKeys = ['clientName', 'name', 'distributorName', 'companyId', 'associate', 'id', 'addedBy', 'addedByName', 'assignedToUid'];
                    return typeof v !== 'object' && !ignoredKeys.includes(k);
                  })
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => {
                    const formattedKey = key === 'employeeName' ? 'Associate' : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return (
                      <div key={key} className="flex items-start gap-4 pb-4 border-b border-zinc-100 group">
                        <div className="mt-0.5 text-zinc-400 group-hover:text-black transition-colors">
                          {getIconForKey(key)}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">
                            {formattedKey}
                          </div>
                          <div className="text-[14px] text-zinc-900 font-medium whitespace-pre-wrap">
                            {value || <span className="text-zinc-300 italic">Not provided</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">{editingLeadId ? 'Edit Lead' : 'Add New Regular Lead'}</h2>
              <button type="button" onClick={() => {
                if (!isSubmitting) {
                  setIsModalOpen(false);
                  setEditingLeadId(null);
                  setFormData({ name: '', institutionName: '', contactNo: '', place: '', leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), priority: 'Medium', followUpDate: '', message: '', remarks: '' });
                }
              }} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLead} className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Contact Name</label>
                  <input type="text" required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="Enter contact name" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Institution Name</label>
                  <input type="text" name="institutionName" value={formData.institutionName} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="Enter institution" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Contact Number</label>
                  <input type="text" required name="contactNo" value={formData.contactNo} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="Enter number" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Region / Place</label>
                  <input type="text" required name="place" value={formData.place} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="City or State" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Lead Type</label>
                  <select name="leadType" value={formData.leadType} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all text-zinc-700">
                    <option value="Clinic">Clinic</option>
                    <option value="Physiotherapist">Physiotherapist</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {formData.leadType === 'Other' && (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Custom Lead Type</label>
                    <input type="text" required name="customLeadType" value={formData.customLeadType} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="Specify type" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Assigned Employee</label>
                  <input type="text" name="assignedToName" value={formData.assignedToName} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" placeholder="e.g. Navaneeth" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all text-zinc-700">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Follow-up Date</label>
                <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Message / Lead Details</label>
                <textarea name="message" value={formData.message} onChange={handleInputChange} rows="2" className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all resize-none" placeholder="Enter lead details..." />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Internal Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows="2" className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all resize-none" placeholder="Add any internal notes..." />
              </div>

              <div className="flex gap-2 pt-2 mt-2 sticky bottom-0 bg-white">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingLeadId(null);
                  setFormData({ name: '', institutionName: '', contactNo: '', place: '', leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), priority: 'Medium', followUpDate: '', message: '', remarks: '' });
                }} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingLeadId ? 'Save Changes' : 'Save Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
