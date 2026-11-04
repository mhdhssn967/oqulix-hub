import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { 
  Users, User, Calendar as CalendarIcon, Phone, Mail, MapPin, Search, Plus, 
  ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Clock, 
  AlertCircle, TrendingUp, Flame, Tag, Loader2, MessageSquare, Edit2, X,
  Building2, DollarSign, Briefcase, Hash, FileText, CheckCircle, Target
} from 'lucide-react';
import Swal from 'sweetalert2';
import QuickUpdateModal from '../components/QuickUpdateModal';

export default function TeamCRM() {
  const navigate = useNavigate();
  const { user, isAdmin, isManager, isHR, companyId, employeeData } = useAuthStore();

  const [activeSegment, setActiveSegment] = useState('happymoves');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedSubordinate, setSelectedSubordinate] = useState(null);

  // Leads Data for the active segment
  const [leads, setLeads] = useState([]);
  const [adLeads, setAdLeads] = useState([]);
  const [distributors, setDistributors] = useState([]);

  // Active view: 'pipeline' or 'calendar'
  const [activeView, setActiveView] = useState('pipeline');
  const [selectedLeadTypeTab, setSelectedLeadTypeTab] = useState('all'); // 'all', 'regular', 'ads', 'distributors'

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  // Lead Details & Quick Update Modal State
  const [selectedLead, setSelectedLead] = useState(null);
  const [quickUpdateLead, setQuickUpdateLead] = useState(null);

  // Edit / Add Lead Modal State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    clientName: '',
    contactNo: '',
    place: '',
    leadType: 'Hospital',
    currentStatus: 'New Lead',
    priority: 'Medium',
    remarks: '',
    nextFollowUp: '',
    lastContacted: new Date().toISOString().split('T')[0]
  });

  // Fetch Team & Leads Data
  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Fetch all employees from company and root collection to merge photoURL
      const [empSnap, rootEmpSnap] = await Promise.all([
        getDocs(collection(db, `userData/${companyId}/employees`)),
        getDocs(collection(db, 'employees')).catch(() => ({ docs: [] }))
      ]);
      const rootPhotoMap = {};
      rootEmpSnap.docs.forEach(rd => {
        if (rd.data().photoURL) rootPhotoMap[rd.id] = rd.data().photoURL;
      });

      const allEmps = empSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          ...data,
          photoURL: data.photoURL || rootPhotoMap[d.id] || null
        };
      });

      // Filter subordinates:
      // If user is Admin or HR, they can supervise all employees.
      // If regular manager/employee, filter employees who have managerId === user.uid
      let teamMembers = [];
      if (isAdmin || isHR) {
        teamMembers = allEmps.filter(e => e.id !== user?.uid && e.isActive !== false);
      } else {
        teamMembers = allEmps.filter(e => e.managerId === user?.uid && e.isActive !== false);
      }
      setEmployees(teamMembers);

      if (teamMembers.length > 0 && !selectedSubordinate) {
        setSelectedSubordinate(teamMembers[0]);
      }

      // 2. Fetch segment CRM collections
      const [leadsSnap, adLeadsSnap, distSnap] = await Promise.all([
        getDocs(collection(db, `userData/${companyId}/segments/${activeSegment}/crmData/leads/items`)),
        getDocs(collection(db, `userData/${companyId}/segments/${activeSegment}/crmData/adLeads/items`)),
        getDocs(collection(db, `userData/${companyId}/segments/${activeSegment}/crmData/distributors/items`))
      ]);

      setLeads(leadsSnap.docs.map(d => ({ id: d.id, _type: 'regular', ...d.data() })));
      setAdLeads(adLeadsSnap.docs.map(d => ({ id: d.id, _type: 'ads', ...d.data() })));
      setDistributors(distSnap.docs.map(d => ({ id: d.id, _type: 'distributor', ...d.data() })));

    } catch (err) {
      console.error('Error fetching Team CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, activeSegment, user?.uid]);

  // Combine and filter items belonging to the selected subordinate
  const subordinateItems = useMemo(() => {
    if (!selectedSubordinate) return [];
    const subUid = selectedSubordinate.id;
    const subName = selectedSubordinate.name?.toLowerCase().trim();

    const matchesSubordinate = (item) => {
      if (item.userId === subUid || item.assignedToUid === subUid) return true;
      const assignedName = (item.assignedToName || item.employeeName || '').toLowerCase().trim();
      return assignedName === subName;
    };

    let allItems = [];
    if (selectedLeadTypeTab === 'all' || selectedLeadTypeTab === 'regular') {
      allItems = allItems.concat(leads.filter(matchesSubordinate));
    }
    if (selectedLeadTypeTab === 'all' || selectedLeadTypeTab === 'ads') {
      allItems = allItems.concat(adLeads.filter(matchesSubordinate));
    }
    if (selectedLeadTypeTab === 'all' || selectedLeadTypeTab === 'distributors') {
      allItems = allItems.concat(distributors.filter(matchesSubordinate));
    }

    if (statusFilter) {
      allItems = allItems.filter(item => (item.currentStatus || 'New Lead') === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      allItems = allItems.filter(item => {
        const text = `${item.clientName || ''} ${item.name || ''} ${item.contactNo || item.contactNumber || ''} ${item.place || item.region || ''} ${item.remarks || ''}`.toLowerCase();
        return text.includes(q);
      });
    }

    return allItems;
  }, [selectedSubordinate, leads, adLeads, distributors, selectedLeadTypeTab, statusFilter, searchQuery]);

  // Calendar Day Activity Mapping
  const calendarActivityMap = useMemo(() => {
    if (!selectedSubordinate) return {};
    const map = {};

    subordinateItems.forEach(item => {
      // 1. Creation / Added Date
      const createdRaw = item.date || item.createdAt;
      let createdStr = null;
      if (createdRaw?.seconds) {
        createdStr = new Date(createdRaw.seconds * 1000).toISOString().split('T')[0];
      } else if (typeof createdRaw === 'string') {
        createdStr = createdRaw.slice(0, 10);
      }
      if (createdStr) {
        if (!map[createdStr]) map[createdStr] = { added: [], contacted: [], followups: [], won: [] };
        map[createdStr].added.push(item);
      }

      // 2. Status History interactions
      if (Array.isArray(item.statusHistory)) {
        item.statusHistory.forEach(h => {
          if (h.date) {
            const hDate = new Date(h.date).toISOString().split('T')[0];
            if (!map[hDate]) map[hDate] = { added: [], contacted: [], followups: [], won: [] };
            map[hDate].contacted.push({ ...item, statusNote: h.status, remarkNote: h.remarks });
            if (h.status && (h.status.toLowerCase().includes('closed') || h.status.toLowerCase().includes('won'))) {
              map[hDate].won.push(item);
            }
          }
        });
      }

      // 3. Next Follow Up Date
      const nextDate = item.nextFollowUp || item.followUpDate;
      if (nextDate && typeof nextDate === 'string' && nextDate.length >= 10) {
        const fStr = nextDate.slice(0, 10);
        if (!map[fStr]) map[fStr] = { added: [], contacted: [], followups: [], won: [] };
        map[fStr].followups.push(item);
      }
    });

    return map;
  }, [subordinateItems, selectedSubordinate]);

  // Handle Save / Add / Update Lead for Subordinate
  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!companyId || !selectedSubordinate) return;
    setIsSubmitting(true);

    try {
      const targetCol = editingLead?._type === 'ads' ? 'adLeads' : editingLead?._type === 'distributor' ? 'distributors' : 'leads';
      const docId = editingLead ? editingLead.id : doc(collection(db, 'temp')).id;
      const docRef = doc(db, 'userData', companyId, 'segments', activeSegment, 'crmData', targetCol, 'items', docId);

      const statusAudit = {
        date: new Date().toISOString(),
        status: leadFormData.currentStatus,
        remarks: leadFormData.remarks || '',
        updatedBy: employeeData?.name || (isAdmin ? 'Admin' : 'Manager')
      };

      const payload = {
        name: leadFormData.name,
        clientName: leadFormData.clientName || leadFormData.name,
        contactNo: leadFormData.contactNo,
        contactNumber: leadFormData.contactNo,
        place: leadFormData.place,
        region: leadFormData.place,
        leadType: leadFormData.leadType,
        currentStatus: leadFormData.currentStatus,
        priority: leadFormData.priority,
        remarks: leadFormData.remarks,
        nextFollowUp: leadFormData.nextFollowUp,
        lastContacted: leadFormData.lastContacted,
        assignedToUid: selectedSubordinate.id,
        assignedToName: selectedSubordinate.name,
        employeeName: selectedSubordinate.name,
        userId: selectedSubordinate.id,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion(statusAudit)
      };

      if (!editingLead) {
        payload.createdAt = serverTimestamp();
        payload.date = new Date().toISOString().split('T')[0];
        payload.addedByName = employeeData?.name || (isAdmin ? 'Admin' : 'Manager');
      }

      await setDoc(docRef, payload, { merge: true });

      // Update local state
      const newItem = { id: docId, _type: targetCol === 'leads' ? 'regular' : targetCol, ...payload };
      if (editingLead) {
        if (targetCol === 'leads') setLeads(prev => prev.map(l => l.id === docId ? newItem : l));
        if (targetCol === 'adLeads') setAdLeads(prev => prev.map(l => l.id === docId ? newItem : l));
        if (targetCol === 'distributors') setDistributors(prev => prev.map(l => l.id === docId ? newItem : l));
      } else {
        setLeads(prev => [newItem, ...prev]);
      }

      setIsLeadModalOpen(false);
      setEditingLead(null);
      Swal.fire({ icon: 'success', title: editingLead ? 'Updated' : 'Lead Added', text: `Saved for ${selectedSubordinate.name}`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error('Error saving lead for team member:', err);
      Swal.fire('Error', 'Failed to save lead: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingLead(null);
    setLeadFormData({
      name: '',
      clientName: '',
      contactNo: '',
      place: '',
      leadType: 'Hospital',
      currentStatus: 'New Lead',
      priority: 'Medium',
      remarks: '',
      nextFollowUp: '',
      lastContacted: new Date().toISOString().split('T')[0]
    });
    setIsLeadModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingLead(item);
    setLeadFormData({
      name: item.name || item.clientName || '',
      clientName: item.clientName || item.name || '',
      contactNo: item.contactNo || item.contactNumber || '',
      place: item.place || item.region || '',
      leadType: item.leadType || 'Hospital',
      currentStatus: item.currentStatus || 'New Lead',
      priority: item.priority || 'Medium',
      remarks: item.remarks || '',
      nextFollowUp: item.nextFollowUp || item.followUpDate || '',
      lastContacted: item.lastContacted || new Date().toISOString().split('T')[0]
    });
    setIsLeadModalOpen(true);
  };

  const getIconForKey = (key) => {
    const k = key.toLowerCase();
    if (k.includes('name') || k.includes('client') || k.includes('institution')) return <Building2 className="w-4 h-4" />;
    if (k.includes('contact') || k.includes('person')) return <User className="w-4 h-4" />;
    if (k.includes('phone') || k.includes('number') || k.includes('contactno')) return <Phone className="w-4 h-4" />;
    if (k.includes('email')) return <Mail className="w-4 h-4" />;
    if (k.includes('place') || k.includes('country') || k.includes('region') || k.includes('address') || k.includes('state')) return <MapPin className="w-4 h-4" />;
    if (k.includes('price') || k.includes('value')) return <DollarSign className="w-4 h-4" />;
    if (k.includes('date') || k.includes('followup') || k.includes('time')) return <CalendarIcon className="w-4 h-4" />;
    if (k.includes('status')) return <CheckCircle className="w-4 h-4" />;
    if (k.includes('priority')) return <AlertCircle className="w-4 h-4" />;
    if (k.includes('designation') || k.includes('role')) return <Briefcase className="w-4 h-4" />;
    if (k.includes('remarks') || k.includes('message')) return <MessageSquare className="w-4 h-4" />;
    if (k.includes('type')) return <Tag className="w-4 h-4" />;
    if (k.includes('id')) return <Hash className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-zinc-100 text-zinc-700';
    const s = status.toLowerCase();
    if (s.includes('new lead')) return 'bg-blue-100 text-blue-700';
    if (s.includes('contacted') && !s.includes('no response')) return 'bg-amber-100 text-amber-700';
    if (s.includes('no response')) return 'bg-red-100 text-red-700';
    if (s.includes('interested')) return 'bg-purple-100 text-purple-700';
    if (s.includes('follow up') || s.includes('follow-up')) return 'bg-orange-100 text-orange-700';
    if (s.includes('quotation sent')) return 'bg-cyan-100 text-cyan-700';
    if (s.includes('awaiting decision')) return 'bg-indigo-100 text-indigo-700';
    if (s.includes('token')) return 'bg-teal-100 text-teal-700';
    if (s.includes('closed') || s.includes('won')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('lost') || s.includes('not interested')) return 'bg-rose-100 text-rose-700';
    if (s.includes('inactive') || s.includes('terminated')) return 'bg-zinc-200 text-zinc-600';
    return 'bg-zinc-100 text-zinc-700';
  };

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)] font-sans pb-6 lg:pb-0">
      {/* Top Header */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-200/60">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => navigate('/crm')}
              className="text-zinc-500 hover:text-black flex items-center gap-1 text-[13px] font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to CRM Pipeline
            </button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              Team CRM & Performance
            </h1>
          </div>
          <p className="text-[13px] sm:text-[14px] text-zinc-500 mt-1">
            Supervise team leads, manage pipeline updates, and analyze daily performance.
          </p>
        </div>

        {/* Segment Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start md:self-auto">
          <button 
            onClick={() => setActiveSegment('happymoves')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-bold transition-all ${activeSegment === 'happymoves' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Happy Moves
          </button>
          <button 
            onClick={() => setActiveSegment('gamefaktory')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-bold transition-all ${activeSegment === 'gamefaktory' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Game Faktory
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {loading ? (
        <div className="flex-1 p-16 flex items-center justify-center bg-white rounded-2xl border border-zinc-200 mt-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex-1 bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 text-center text-zinc-500 flex flex-col items-center justify-center mt-4">
          <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
          <h3 className="text-[16px] font-semibold text-zinc-800">No Subordinate Employees Assigned</h3>
          <p className="text-[13px] text-zinc-500 mt-1 max-w-md mx-auto">
            You do not have any employees assigned under you yet. An HR or Admin can assign reporting employees in the <strong>Employees</strong> section.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 pt-4 flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 items-stretch">
          {/* Subordinates List - Horizontal chips on mobile, vertical sidebar on desktop */}
          <div className="lg:col-span-1 shrink-0 bg-white border border-zinc-200/80 rounded-2xl p-3 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col lg:min-h-0">
            <div className="shrink-0 text-[11px] font-bold text-zinc-400 uppercase tracking-wider pb-2 lg:pb-3 border-b border-zinc-100 flex items-center justify-between">
              <span>Your Team Members</span>
              <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">{employees.length}</span>
            </div>
            
            {/* Scrollable list: horizontal scroll on mobile, vertical scroll on desktop */}
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-2 pt-3 no-scrollbar lg:custom-scrollbar">
              {employees.map(emp => {
                const isSelected = selectedSubordinate?.id === emp.id;
                const empLeadsCount = leads.filter(l => l.userId === emp.id || l.assignedToUid === emp.id).length;
                const empAdLeadsCount = adLeads.filter(l => l.userId === emp.id || l.assignedToUid === emp.id).length;
                const totalCount = empLeadsCount + empAdLeadsCount;

                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedSubordinate(emp);
                      setSelectedDayEvents(null);
                    }}
                    className={`shrink-0 lg:w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-300 shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {emp.photoURL ? (
                        <img 
                          src={emp.photoURL} 
                          alt={emp.name} 
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 shadow-sm ring-1 ring-black/10" 
                        />
                      ) : (
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-[12px] shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-[12px] sm:text-[13px] font-bold text-zinc-900 truncate max-w-[120px] sm:max-w-none">{emp.name}</h4>
                        <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate capitalize">{emp.position || 'Associate'}</p>
                      </div>
                    </div>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-zinc-100 text-zinc-700 shrink-0">
                      {totalCount} leads
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Panel: Subordinate Details, Pipeline & Calendar */}
          <div className="lg:col-span-3 flex flex-col flex-1 min-h-0 gap-4">
            {selectedSubordinate && (
              <div className="shrink-0 bg-white p-3.5 sm:p-4 lg:p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3">
                  {selectedSubordinate.photoURL ? (
                    <img 
                      src={selectedSubordinate.photoURL} 
                      alt={selectedSubordinate.name} 
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shrink-0 shadow-sm ring-2 ring-purple-500/20" 
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[14px] sm:text-[16px] shrink-0">
                      {selectedSubordinate.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-[15px] sm:text-[17px] font-bold text-zinc-900 truncate">{selectedSubordinate.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-[12px] text-zinc-500 mt-0.5">
                      <span className="capitalize">{selectedSubordinate.position || 'Associate'}</span>
                      {selectedSubordinate.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedSubordinate.phone}</span>
                      )}
                      {selectedSubordinate.assignedRegions && (
                        <span className="hidden sm:flex items-center gap-1 max-w-md truncate" title={selectedSubordinate.assignedRegions}>
                          <MapPin className="w-3 h-3 shrink-0" /> {selectedSubordinate.assignedRegions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
                  <div className="flex rounded-lg bg-zinc-100 p-1 border border-zinc-200">
                    <button
                      onClick={() => setActiveView('pipeline')}
                      className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-[12px] font-bold transition-all ${activeView === 'pipeline' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'}`}
                    >
                      Pipeline
                    </button>
                    <button
                      onClick={() => setActiveView('calendar')}
                      className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-[12px] font-bold transition-all flex items-center gap-1.5 ${activeView === 'calendar' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'}`}
                    >
                      <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Calendar
                    </button>
                  </div>
                  <button
                    onClick={openAddModal}
                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-black hover:bg-zinc-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Lead
                  </button>
                </div>
              </div>
            )}

            {/* View 1: Pipeline Table View */}
            {activeView === 'pipeline' && (
              <div className="flex-1 min-h-[350px] lg:min-h-0 bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
                {/* Filters */}
                <div className="shrink-0 p-3 sm:p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:w-60 min-w-[150px]">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[12px] sm:text-[13px] outline-none focus:ring-1 focus:ring-black focus:border-black"
                      />
                    </div>
                    <select
                      value={selectedLeadTypeTab}
                      onChange={e => setSelectedLeadTypeTab(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-[11px] sm:text-[12px] font-medium outline-none cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="regular">Regular Leads</option>
                      <option value="ads">Ad Leads</option>
                      <option value="distributors">Distributors</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-[11px] sm:text-[12px] font-medium outline-none cursor-pointer"
                    >
                      <option value="">All Statuses</option>
                      <option value="New Lead">New Lead</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Connected via whatsapp">Connected via whatsapp</option>
                      <option value="Interested">Interested</option>
                      <option value="Follow up needed">Follow up needed</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Deal Closed">Deal Closed</option>
                      <option value="Deal Lost">Deal Lost</option>
                    </select>
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-zinc-500 font-medium self-end sm:self-auto">
                    Showing <strong>{subordinateItems.length}</strong> items
                  </div>
                </div>

                {/* Table with responsive horizontal scroll wrapper */}
                <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead className="sticky top-0 z-10 bg-zinc-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-zinc-200 text-[10px] sm:text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50">Lead / Client</th>
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50">Contact</th>
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50">Status</th>
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50">Next Follow Up</th>
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50">Latest Remarks</th>
                        <th className="px-3 sm:px-4 py-3 bg-zinc-50 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-[12px] sm:text-[13px]">
                      {subordinateItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-zinc-400">
                            No records found for this team member under current filters.
                          </td>
                        </tr>
                      ) : (
                        subordinateItems.map(item => (
                          <tr 
                            key={item.id} 
                            onClick={() => setQuickUpdateLead(item)}
                            className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">{item.clientName || item.name || 'Untitled'}</div>
                              <div className="text-[11px] text-zinc-400 capitalize">{item._type || 'lead'} · {item.place || item.region || 'No region'}</div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 font-medium">
                              {item.contactNo || item.contactNumber || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
                                {item.currentStatus || 'New Lead'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {item.nextFollowUp || item.followUpDate || '—'}
                            </td>
                            <td className="px-4 py-3 text-zinc-500 max-w-xs truncate" title={item.remarks}>
                              {item.remarks || '—'}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(item);
                                }}
                                className="p-1.5 hover:bg-zinc-200/70 rounded-md text-zinc-500 hover:text-black transition-colors"
                                title="Edit Lead Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View 2: Calendar Performance View */}
            {activeView === 'calendar' && (
              <div className="flex-1 min-h-0 bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
                {/* Month Navigator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <h3 className="text-[15px] sm:text-[16px] font-bold text-zinc-900">
                      {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button
                      onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCalendarDate(new Date())}
                      className="px-2.5 sm:px-3 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-[11px] sm:text-[12px] font-semibold transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] sm:text-[12px] text-zinc-600 bg-zinc-50 p-2 sm:p-2.5 rounded-xl border border-zinc-100">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-blue-500 inline-block"></span> Added
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-amber-500 inline-block"></span> Calls/Notes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-purple-500 inline-block"></span> Follow-Ups
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 inline-block"></span> Deals Won
                  </span>
                </div>

                {/* Calendar Grid with responsive horizontal scroll on very narrow screens */}
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                  <div className="min-w-[550px] grid grid-cols-7 gap-1.5 sm:gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center font-bold text-[10px] sm:text-[11px] uppercase text-zinc-400 py-1">
                        {d}
                      </div>
                    ))}

                    {/* Empty slots for start padding */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[75px] sm:min-h-[85px] bg-zinc-50/40 rounded-xl border border-dashed border-zinc-100"></div>
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const activity = calendarActivityMap[dayStr] || { added: [], contacted: [], followups: [], won: [] };
                      const hasActivity = activity.added.length > 0 || activity.contacted.length > 0 || activity.followups.length > 0 || activity.won.length > 0;
                      const isToday = new Date().toISOString().split('T')[0] === dayStr;

                      return (
                        <div
                          key={dayStr}
                          onClick={() => hasActivity && setSelectedDayEvents({ date: dayStr, ...activity })}
                          className={`min-h-[75px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                            hasActivity ? 'cursor-pointer hover:shadow-md hover:border-purple-300' : ''
                          } ${isToday ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-300' : 'bg-white border-zinc-200/80'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] sm:text-[12px] font-bold ${isToday ? 'text-purple-700' : 'text-zinc-700'}`}>
                              {dayNum}
                            </span>
                            {activity.won.length > 0 && (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">
                                WON!
                              </span>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex flex-col gap-0.5 sm:gap-1 mt-1">
                            {activity.added.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate">
                                +{activity.added.length} Added
                              </span>
                            )}
                            {activity.contacted.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate">
                                {activity.contacted.length} Calls
                              </span>
                            )}
                            {activity.followups.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] bg-purple-50 text-purple-700 font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate">
                                {activity.followups.length} Follow-ups
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Day Detail Modal Drawer */}
            {selectedDayEvents && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDayEvents(null)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-zinc-900 text-[15px]">Daily Activity Details</h3>
                      <p className="text-[12px] text-zinc-500">{selectedSubordinate?.name} · {selectedDayEvents.date}</p>
                    </div>
                    <button onClick={() => setSelectedDayEvents(null)} className="text-zinc-400 hover:text-black">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex flex-col gap-3">
                    {selectedDayEvents.added.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">Leads Added ({selectedDayEvents.added.length})</h4>
                        <div className="space-y-1.5">
                          {selectedDayEvents.added.map((it, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setSelectedDayEvents(null);
                                setQuickUpdateLead(it);
                              }}
                              className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-[12px] flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
                            >
                              <span className="font-semibold text-zinc-800">{it.clientName || it.name}</span>
                              <span className="text-zinc-500">{it.contactNo || it.contactNumber}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDayEvents.contacted.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Calls & Interactions ({selectedDayEvents.contacted.length})</h4>
                        <div className="space-y-1.5">
                          {selectedDayEvents.contacted.map((it, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setSelectedDayEvents(null);
                                setQuickUpdateLead(it);
                              }}
                              className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 text-[12px] cursor-pointer hover:bg-amber-100/60 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-zinc-800">{it.clientName || it.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">{it.statusNote}</span>
                              </div>
                              {it.remarkNote && <p className="text-zinc-600 text-[11px] mt-1">{it.remarkNote}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDayEvents.followups.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-1.5">Follow-ups Scheduled ({selectedDayEvents.followups.length})</h4>
                        <div className="space-y-1.5">
                          {selectedDayEvents.followups.map((it, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setSelectedDayEvents(null);
                                setQuickUpdateLead(it);
                              }}
                              className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100 text-[12px] flex items-center justify-between cursor-pointer hover:bg-purple-100/60 transition-colors"
                            >
                              <span className="font-semibold text-zinc-800">{it.clientName || it.name}</span>
                              <span className="text-purple-700 font-medium">{it.nextFollowUp || it.followUpDate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Lead Modal for Subordinate */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !isSubmitting && setIsLeadModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 text-[16px]">{editingLead ? 'Edit Lead' : 'Add Lead for Team Member'}</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">Assigned to: <strong>{selectedSubordinate?.name}</strong></p>
              </div>
              <button onClick={() => !isSubmitting && setIsLeadModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-5 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Lead / Client Name</label>
                  <input
                    type="text"
                    required
                    value={leadFormData.name}
                    onChange={e => setLeadFormData({ ...leadFormData, name: e.target.value, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black"
                    placeholder="e.g. Apollo Hospital / Dr. Kumar"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={leadFormData.contactNo}
                    onChange={e => setLeadFormData({ ...leadFormData, contactNo: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Region / Place</label>
                  <input
                    type="text"
                    value={leadFormData.place}
                    onChange={e => setLeadFormData({ ...leadFormData, place: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black"
                    placeholder="e.g. Kochi, Calicut"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={leadFormData.currentStatus}
                    onChange={e => setLeadFormData({ ...leadFormData, currentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none cursor-pointer"
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Connected via whatsapp">Connected via whatsapp</option>
                    <option value="Interested">Interested</option>
                    <option value="Follow up needed">Follow up needed</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Deal Closed">Deal Closed</option>
                    <option value="Deal Lost">Deal Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Next Follow Up</label>
                  <input
                    type="date"
                    value={leadFormData.nextFollowUp}
                    onChange={e => setLeadFormData({ ...leadFormData, nextFollowUp: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Remarks / Meeting Notes</label>
                  <textarea
                    rows={3}
                    value={leadFormData.remarks}
                    onChange={e => setLeadFormData({ ...leadFormData, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none resize-none"
                    placeholder="Add details of conversation, requirements, quote notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingLead ? 'Update Lead' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Update Modal for Team Leads */}
      {quickUpdateLead && (
        <QuickUpdateModal 
          lead={quickUpdateLead}
          companyId={companyId}
          activeSegment={activeSegment}
          isAdmin={isAdmin}
          isHR={isHR}
          activeTab={quickUpdateLead._type === 'ads' ? 'ads' : quickUpdateLead._type === 'distributor' ? 'distributors' : 'regular'}
          onFullProfile={(lead) => {
            setSelectedLead(lead);
            setQuickUpdateLead(null);
          }}
          onClose={() => setQuickUpdateLead(null)}
          onSuccess={(updatedData) => {
            const updateList = (prev) => prev.map(it => it.id === quickUpdateLead.id ? { ...it, ...updatedData } : it);
            setLeads(updateList);
            setAdLeads(updateList);
            setDistributors(updateList);
            setQuickUpdateLead(null);
          }}
        />
      )}

      {/* Full Lead Details / Profile Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-5 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 opacity-10 pointer-events-none">
                <Target className="w-64 h-64 text-white" />
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="absolute top-4 right-4 sm:hidden text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl p-2 z-20"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative z-10 w-full sm:w-auto pr-10 sm:pr-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md tracking-wide uppercase">
                    Lead Profile
                  </span>
                  {selectedLead.currentStatus && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-emerald-500/30 tracking-wide uppercase">
                      {selectedLead.currentStatus}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight break-words">
                  {selectedLead.clientName || selectedLead.name || selectedLead.distributorName || 'Unknown Lead'}
                </h2>
                {(selectedLead.place || selectedLead.region) && (
                  <p className="text-zinc-400 mt-2 flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4" />
                    {selectedLead.place || selectedLead.region} {selectedLead.country ? `, ${selectedLead.country}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2.5 relative z-10 w-full sm:w-auto mt-4 sm:mt-0">
                <button 
                  onClick={() => {
                    const leadToEdit = selectedLead;
                    setSelectedLead(null);
                    openEditModal(leadToEdit);
                  }}
                  className="bg-white/10 text-white border border-white/20 hover:bg-white hover:text-black transition-all rounded-xl px-4 py-2 text-[13px] font-bold shadow-md flex items-center gap-2 backdrop-blur-md"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="hidden sm:flex text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {Object.entries(selectedLead)
                  .filter(([k,v]) => {
                    const ignoredKeys = ['clientName', 'name', 'distributorName', 'companyId', 'associate', 'id', 'addedBy', 'addedByName', 'assignedToUid', 'userId', 'statusHistory'];
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
              
              {selectedLead.statusHistory && selectedLead.statusHistory.length > 0 && (
                <div className="mt-8 border-t border-zinc-100 pt-6">
                  <h3 className="text-[12px] font-bold text-zinc-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    Update History & Remarks
                  </h3>
                  <div className="space-y-6">
                    {selectedLead.statusHistory.map((history, idx) => {
                      const colorClass = getStatusColor(history.status);
                      const textClass = colorClass.split(' ')[1] || 'text-zinc-700';
                      const dotColor = textClass.replace('text-', 'bg-');
                      
                      return (
                        <div key={idx} className="flex gap-4 items-stretch relative">
                          <div className="w-24 shrink-0 text-right pt-1">
                            <div className="text-[12px] font-bold text-zinc-700">
                              {new Date(history.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                              {new Date(history.date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div className="relative flex flex-col items-center shrink-0 w-6 pt-1.5">
                            {idx !== selectedLead.statusHistory.length - 1 && (
                              <div className="absolute top-5 bottom-[-24px] w-0.5 bg-zinc-200"></div>
                            )}
                            <div className={`w-3.5 h-3.5 rounded-full z-10 border-2 border-black ${dotColor} ring-[3px] ring-white`}></div>
                          </div>

                          <div className={`flex-1 rounded-xl p-4 border ${colorClass}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-[14px]">{history.status}</span>
                              {history.updatedBy && (
                                <span className="text-[11px] opacity-75 font-medium">By {history.updatedBy}</span>
                              )}
                            </div>
                            {history.remarks && (
                              <p className="text-[13px] leading-relaxed opacity-90 mt-2 whitespace-pre-wrap">{history.remarks}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

