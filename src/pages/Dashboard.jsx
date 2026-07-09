import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, Calendar, User, Building2, MapPin, Target, AlertCircle, X, DollarSign, Briefcase, Hash, Clock, FileText, CheckCircle, Tag, Globe, MessageSquare, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { doc, getDoc, getDocs, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';

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
  const [quickUpdateLead, setQuickUpdateLead] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const { user, isAdmin, isManager, companyId, employeeData } = useAuthStore();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showIrregularPhonesOnly, setShowIrregularPhonesOnly] = useState(false);

  // Add Lead Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdLeadModalOpen, setIsAdLeadModalOpen] = useState(false);
  const [isDistributorModalOpen, setIsDistributorModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    clientName: '',
    priority: '',
    place: '',
    country: '',
    personOfContact: '',
    pocDesignation: '',
    contactNo: '',
    personOfContact2: '',
    contactNo2: '',
    referralPerson: '',
    email: '',
    currentStatus: 'New Lead',
    fPrice: '',
    lPrice: '',
    lastContacted: '',
    nextFollowUp: '',
    remarks: '',
    leadType: 'Clinic',
    customLeadType: '',
    assignedToName: '',
    message: ''
  });

  const [adLeadFormData, setAdLeadFormData] = useState({
    name: '',
    institutionName: '',
    contactNumber: '',
    region: '',
    leadType: '',
    customLeadType: '',
    priority: 'Medium',
    remarks: '',
    followUpDate: '',
    assignedToUid: '',
    assignedToName: '',
    message: ''
  });

  const [distributorFormData, setDistributorFormData] = useState({
    distributorName: '', state: '', region: '', exclusive: '',
    teamSize: '', contactPersonName: '', contactNumber: '', email: '',
    address: '', gstNumber: '', establishedYear: '',
    currentStatus: 'Contacted', lastMeetingDate: new Date().toISOString().split('T')[0], nextFollowUp: '',
    productLinesHandled: '', territoryDescription: '', remarks: '',
  });

  // Auto-fill assignedToName for employees when modal opens
  useEffect(() => {
    if ((isModalOpen || isAdLeadModalOpen || isDistributorModalOpen) && (!isAdmin && !isManager) && employeeData) {
      setFormData(prev => ({ ...prev, assignedToName: employeeData.name }));
      setAdLeadFormData(prev => ({ ...prev, assignedToName: employeeData.name, assignedToUid: user.uid }));
    }
  }, [isModalOpen, isAdLeadModalOpen, isDistributorModalOpen, isAdmin, isManager, employeeData, user]);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAdLeadInputChange = (e) => setAdLeadFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDistributorInputChange = (e) => setDistributorFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const finalLeadType = formData.leadType === 'Other' ? formData.customLeadType : formData.leadType;
      
      const leadPayload = {
        date: formData.date,
        name: formData.clientName || formData.name,
        clientName: formData.clientName || formData.name,
        priority: formData.priority,
        place: formData.place,
        region: formData.place,
        country: formData.country,
        personOfContact: formData.personOfContact,
        pocDesignation: formData.pocDesignation,
        contactNo: formData.contactNo,
        personOfContact2: formData.personOfContact2,
        contactNo2: formData.contactNo2,
        referralPerson: formData.referralPerson,
        email: formData.email,
        currentStatus: formData.currentStatus,
        fPrice: formData.fPrice,
        lPrice: formData.lPrice,
        lastContacted: formData.lastContacted,
        nextFollowUp: formData.nextFollowUp,
        remarks: formData.remarks,
        leadType: finalLeadType,
        assignedToName: formData.assignedToName,
        message: formData.message,
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
        date: new Date().toISOString().split('T')[0], clientName: '', name: '', priority: '', place: '', country: '', 
        personOfContact: '', pocDesignation: '', contactNo: '', personOfContact2: '', contactNo2: '', 
        referralPerson: '', email: '', currentStatus: 'New Lead', fPrice: '', lPrice: '', 
        lastContacted: '', nextFollowUp: '', remarks: '', leadType: 'Clinic', customLeadType: '', 
        assignedToName: isAdmin ? '' : (employeeData?.name || ''), message: '' 
      });
    } catch (err) {
      console.error("Error saving lead:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdLead = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    
    if (!adLeadFormData.name.trim() || !adLeadFormData.contactNumber.trim() || !adLeadFormData.leadType) {
      Swal.fire({ icon: "warning", title: "Missing Fields", text: "Name, Contact Number and Lead Type are required." });
      return;
    }
    if (!adLeadFormData.assignedToUid && isAdmin) {
      Swal.fire({ icon: "warning", title: "Please assign this lead to an employee." });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalLeadType = adLeadFormData.leadType === 'Other' ? adLeadFormData.customLeadType : adLeadFormData.leadType;
      
      const payload = {
        name: adLeadFormData.name,
        institutionName: adLeadFormData.institutionName,
        contactNumber: adLeadFormData.contactNumber,
        contactNo: adLeadFormData.contactNumber, // for consistency
        region: adLeadFormData.region,
        leadType: finalLeadType,
        priority: adLeadFormData.priority,
        remarks: adLeadFormData.remarks,
        followUpDate: adLeadFormData.followUpDate,
        assignedToUid: (isAdmin || isManager) ? adLeadFormData.assignedToUid : user.uid,
        assignedToName: (isAdmin || isManager) ? adLeadFormData.assignedToName : (employeeData?.name || ''),
        message: adLeadFormData.message,
        updatedAt: new Date(),
        currentStatus: 'New Lead'
      };

      const docRef = doc(db, 'userData', companyId, 'crmData', 'adLeads');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        let items = snap.data().items || [];
        if (editingLeadId) {
          items = items.map(item => item.id === editingLeadId ? { ...item, ...payload } : item);
        } else {
          const newLead = {
            ...payload,
            id: doc(collection(db, 'temp')).id,
            newLead: true,
            employeeName: isAdmin ? 'Admin' : (isManager ? (employeeData?.name || 'Manager') : (employeeData?.name || 'Employee')),
            addedByName: isAdmin ? 'Admin' : (isManager ? (employeeData?.name || 'Manager') : (employeeData?.name || 'Employee')),
            userId: (isAdmin || isManager) ? payload.assignedToUid : user.uid,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date(),
          };
          items = [newLead, ...items];
        }
        await updateDoc(docRef, { items });
        const fetchedLeads = !isAdmin && user?.uid ? items.filter(item => item.userId === user.uid) : items;
        setAdLeads(fetchedLeads);
      }
      
      setIsAdLeadModalOpen(false);
      setEditingLeadId(null);
      setAdLeadFormData({ name: '', institutionName: '', contactNumber: '', region: '', leadType: '', customLeadType: '', priority: 'Medium', remarks: '', followUpDate: '', assignedToUid: '', assignedToName: '', message: '' });
      
      Swal.fire({
        title: editingLeadId ? 'Updated!' : 'Added!',
        text: editingLeadId ? 'Ad lead updated successfully.' : 'Ad lead added successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Error saving ad lead:", err);
      Swal.fire({ title: 'Error', text: 'Failed to save ad lead', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDistributor = async (e) => {
    e.preventDefault();
    if (!companyId) return;

    if (!distributorFormData.distributorName || !distributorFormData.contactNumber || !distributorFormData.state) {
      Swal.fire({ icon: "warning", title: "Missing Fields", text: "Distributor Name, State and Contact Number are required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...distributorFormData,
        name: distributorFormData.distributorName,
        clientName: distributorFormData.distributorName,
        updatedAt: new Date()
      };

      const docRef = doc(db, 'userData', companyId, 'crmData', 'distributors');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        let items = snap.data().items || [];
        if (editingLeadId) {
          items = items.map(item => item.id === editingLeadId ? { ...item, ...payload } : item);
        } else {
          const newDistributor = {
            ...payload,
            id: doc(collection(db, 'temp')).id,
            newLead: true,
            employeeName: isAdmin ? 'Admin' : (employeeData?.name || 'Employee'),
            addedByName: isAdmin ? 'Admin' : (employeeData?.name || 'Employee'),
            userId: user.uid,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date(),
          };
          items = [newDistributor, ...items];
        }
        await updateDoc(docRef, { items });
        const fetchedDistributors = !isAdmin && user?.uid ? items.filter(item => item.userId === user.uid) : items;
        setDistributors(fetchedDistributors);
      }

      setIsDistributorModalOpen(false);
      setEditingLeadId(null);
      setDistributorFormData({ distributorName: '', state: '', region: '', exclusive: '', teamSize: '', contactPersonName: '', contactNumber: '', email: '', address: '', gstNumber: '', establishedYear: '', currentStatus: 'Contacted', lastMeetingDate: new Date().toISOString().split('T')[0], nextFollowUp: '', productLinesHandled: '', territoryDescription: '', remarks: '' });
      
      Swal.fire({
        title: editingLeadId ? 'Updated!' : 'Added!',
        text: editingLeadId ? 'Distributor updated successfully.' : 'Distributor added successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Error saving distributor:", err);
      Swal.fire({ title: 'Error', text: 'Failed to save distributor', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (lead) => {
    if (activeTab === 'ads') {
      setAdLeadFormData({
        name: lead.name || '',
        institutionName: lead.institutionName || '',
        contactNumber: lead.contactNumber || lead.contactNo || '',
        region: lead.region || lead.place || '',
        leadType: ['Hospital', 'Distributor', 'Physiotherapist', 'Clinic', 'Pharmacy', 'Nursing Home'].includes(lead.leadType) ? lead.leadType : 'Other',
        customLeadType: ['Hospital', 'Distributor', 'Physiotherapist', 'Clinic', 'Pharmacy', 'Nursing Home'].includes(lead.leadType) ? '' : (lead.leadType || ''),
        priority: lead.priority || 'Medium',
        remarks: lead.remarks || '',
        followUpDate: lead.followUpDate || lead.nextFollowUp || '',
        assignedToUid: lead.assignedToUid || '',
        assignedToName: lead.assignedToName || '',
        message: lead.message || ''
      });
      setEditingLeadId(lead.id);
      setSelectedLead(null);
      setIsAdLeadModalOpen(true);
    } else if (activeTab === 'distributors') {
      setDistributorFormData({
        distributorName: lead.distributorName || lead.name || lead.clientName || '',
        state: lead.state || '',
        region: lead.region || lead.place || '',
        exclusive: lead.exclusive || '',
        teamSize: lead.teamSize || '',
        contactPersonName: lead.contactPersonName || lead.personOfContact || '',
        contactNumber: lead.contactNumber || lead.contactNo || '',
        email: lead.email || '',
        address: lead.address || '',
        gstNumber: lead.gstNumber || '',
        establishedYear: lead.establishedYear || '',
        currentStatus: lead.currentStatus || 'Contacted',
        lastMeetingDate: lead.lastMeetingDate || '',
        nextFollowUp: lead.nextFollowUp || lead.followUpDate || '',
        productLinesHandled: lead.productLinesHandled || '',
        territoryDescription: lead.territoryDescription || '',
        remarks: lead.remarks || ''
      });
      setEditingLeadId(lead.id);
      setSelectedLead(null);
      setIsDistributorModalOpen(true);
    } else {
      setFormData({
        date: lead.date || new Date().toISOString().split('T')[0],
        name: lead.name || lead.clientName || '',
      clientName: lead.clientName || lead.name || '',
      priority: lead.priority || '',
      place: lead.place || lead.region || '',
      country: lead.country || '',
      personOfContact: lead.personOfContact || '',
      pocDesignation: lead.pocDesignation || '',
      contactNo: lead.contactNo || '',
      personOfContact2: lead.personOfContact2 || '',
      contactNo2: lead.contactNo2 || '',
      referralPerson: lead.referralPerson || '',
      email: lead.email || '',
      currentStatus: lead.currentStatus || 'New Lead',
      fPrice: lead.fPrice || '',
      lPrice: lead.lPrice || '',
      lastContacted: lead.lastContacted || '',
      nextFollowUp: lead.nextFollowUp || lead.followUpDate || '',
      remarks: lead.remarks || '',
      leadType: ['Clinic', 'Physiotherapist', 'Distributor'].includes(lead.leadType) ? lead.leadType : 'Other',
      customLeadType: ['Clinic', 'Physiotherapist', 'Distributor'].includes(lead.leadType) ? '' : (lead.leadType || ''),
      assignedToName: lead.assignedToName || '',
      message: lead.message || ''
    });
    setEditingLeadId(lead.id);
    setSelectedLead(null);
    setIsModalOpen(true);
    }
  };

  const handleDeleteLead = async (lead) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! This record will be permanently deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Deleting...',
      text: 'Please wait while the record is being deleted.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
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
        Swal.fire({
          title: 'Deleted!',
          text: 'The lead has been permanently deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete the lead.',
        icon: 'error'
      });
    }
  };

  const handleQuickUpdate = async (e) => {
    e.preventDefault();
    if (!companyId || !quickUpdateLead) return;
    setIsSubmitting(true);
    
    let collectionName = 'leads';
    if (activeTab === 'ads') collectionName = 'adLeads';
    if (activeTab === 'distributors') collectionName = 'distributors';

    try {
      const docRef = doc(db, 'userData', companyId, 'crmData', collectionName);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const items = snap.data().items || [];
        const newItems = items.map(item => {
          if (item.id === quickUpdateLead.id) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const remarkAddition = updateRemarks.trim() ? `[${dateStr}] ${updateRemarks}` : '';
            const newRemarks = remarkAddition 
              ? (item.remarks ? `${item.remarks}\n${remarkAddition}` : remarkAddition)
              : item.remarks;
              
            return {
              ...item,
              currentStatus: updateStatus,
              remarks: newRemarks,
              lastContacted: new Date().toISOString().split('T')[0]
            };
          }
          return item;
        });
        
        await updateDoc(docRef, { items: newItems });
        
        const fetchedItems = !isAdmin && user?.uid ? newItems.filter(item => item.userId === user.uid) : newItems;
        if (activeTab === 'regular') setRegularLeads(fetchedItems);
        if (activeTab === 'ads') setAdLeads(fetchedItems);
        if (activeTab === 'distributors') setDistributors(fetchedItems);
      }
      setQuickUpdateLead(null);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsSubmitting(false);
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
        const empsColRef = collection(db, 'userData', companyId, 'employees');
        
        const [leadsSnap, adLeadsSnap, distributorsSnap, empsSnap] = await Promise.all([
          getDoc(leadsDocRef),
          getDoc(adLeadsDocRef),
          getDoc(distributorsDocRef),
          getDocs(empsColRef)
        ]);
        
        const empsList = empsSnap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
        setAllEmployees(empsList);

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
            onClick={() => {
              setEditingLeadId(null);
              if (activeTab === 'ads') {
                setAdLeadFormData({ name: '', institutionName: '', contactNumber: '', region: '', leadType: '', customLeadType: '', priority: 'Medium', remarks: '', followUpDate: '', assignedToUid: '', assignedToName: '', message: '' });
                setIsAdLeadModalOpen(true);
              } else if (activeTab === 'distributors') {
                setDistributorFormData({ distributorName: '', state: '', region: '', exclusive: '', teamSize: '', contactPersonName: '', contactNumber: '', email: '', address: '', gstNumber: '', establishedYear: '', currentStatus: 'Contacted', lastMeetingDate: new Date().toISOString().split('T')[0], nextFollowUp: '', productLinesHandled: '', territoryDescription: '', remarks: '' });
                setIsDistributorModalOpen(true);
              } else {
                setFormData({ date: new Date().toISOString().split('T')[0], clientName: '', name: '', priority: '', place: '', country: '', personOfContact: '', pocDesignation: '', contactNo: '', personOfContact2: '', contactNo2: '', referralPerson: '', email: '', currentStatus: 'New Lead', fPrice: '', lPrice: '', lastContacted: '', nextFollowUp: '', remarks: '', leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), message: '' });
                setIsModalOpen(true);
              }
            }}
            className="bg-black hover:bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium text-[13px] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'ads' ? 'Add Ad Lead' : activeTab === 'distributors' ? 'Add Distributor' : 'Add Regular Lead'}
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
                    onClick={() => { setQuickUpdateLead(lead); setUpdateStatus(lead.currentStatus || 'New Lead'); setUpdateRemarks(''); }}
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
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => { setQuickUpdateLead(lead); setUpdateStatus(lead.currentStatus || 'New Lead'); setUpdateRemarks(''); }}>
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
                  <tr key={dist.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => { setQuickUpdateLead(dist); setUpdateStatus(dist.currentStatus || 'New Lead'); setUpdateRemarks(''); }}>
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
      {quickUpdateLead && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={() => setQuickUpdateLead(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 flex items-center justify-between relative overflow-hidden">
               <div className="relative z-10">
                 <h2 className="text-xl font-bold text-white tracking-tight">Quick Update</h2>
                 <p className="text-zinc-400 text-sm mt-1">{quickUpdateLead.clientName || quickUpdateLead.name || quickUpdateLead.distributorName || 'Lead'}</p>
               </div>
               <button onClick={() => setQuickUpdateLead(null)} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 z-20">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <form onSubmit={handleQuickUpdate} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Update Status</label>
                <select 
                  value={updateStatus} 
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] transition-all text-zinc-800 cursor-pointer"
                >
                  {activeTab === 'distributors' ? (
                    <>
                      <option value="Haven't yet contacted">Haven't yet contacted</option>
                      <option value="Called, no response">Called, no response</option>
                      <option value="Contacted and discussed via phone">Contacted and discussed via phone</option>
                      <option value="Online demo done">Online demo done</option>
                      <option value="Live demo done">Live demo done</option>
                      <option value="Hospital presentation done">Hospital presentation done</option>
                      <option value="Agreement Sent & awaiting response">Agreement Sent & waiting</option>
                      <option value="Agreement Signed">Agreement Signed</option>
                      <option value="Purchased Demo Piece">Purchased Demo Piece</option>
                      <option value="Doing Sales">Doing Sales</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Terminated">Terminated</option>
                    </>
                  ) : (
                    <>
                      <option value="New Lead">New Lead</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Interested">Interested</option>
                      <option value="Follow up needed">Follow-Up Needed</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Awaiting Decision">Awaiting Decision</option>
                      <option value="Token Recieved">Token Recieved</option>
                      <option value="Deal Closed">Converted (Deal Won)</option>
                      <option value="Deal Lost">Not Interested (Deal Lost)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Add Remarks (Optional)</label>
                <textarea 
                  value={updateRemarks} 
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  rows="3"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[14px] text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400"
                  placeholder="Note down what was discussed..."
                ></textarea>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl text-[14px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Status'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedLead(quickUpdateLead);
                    setQuickUpdateLead(null);
                  }} 
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  View Full Profile
                </button>
              </div>
            </form>
          </div>
        </div>
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
              <div className="flex items-center gap-3 relative z-10">
                {(activeTab === 'regular' || activeTab === 'ads') && (
                  <button 
                    onClick={() => openEditModal(selectedLead)}
                    className="bg-white/10 text-white border border-white/20 hover:bg-white hover:text-black transition-all rounded-xl px-5 py-2 text-[13px] font-bold shadow-md flex items-center gap-2 backdrop-blur-md"
                  >
                    Edit Profile
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteLead(selectedLead)}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all rounded-xl px-5 py-2 text-[13px] font-bold shadow-md flex items-center gap-2 backdrop-blur-md"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl p-2 ml-1"
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-[18px] font-semibold text-zinc-900">{editingLeadId ? 'Edit Lead Profile' : 'New Lead Profile'}</h2>
              <button type="button" onClick={() => {
                if (!isSubmitting) {
                  setIsModalOpen(false);
                  setEditingLeadId(null);
                  setFormData({ date: new Date().toISOString().split('T')[0], clientName: '', name: '', priority: '', place: '', country: '', personOfContact: '', pocDesignation: '', contactNo: '', personOfContact2: '', contactNo2: '', referralPerson: '', email: '', currentStatus: 'New Lead', fPrice: '', lPrice: '', lastContacted: '', nextFollowUp: '', remarks: '', leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), message: '' });
                }
              }} className="text-zinc-400 hover:text-black transition-colors p-1 bg-white rounded-full shadow-sm border border-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLead} className="flex flex-col max-h-[85vh]">
              <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar flex-1 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2">
                  
                  {/* Left Column */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Core Details</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Date</label>
                      <input type="date" required name="date" value={formData.date} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Client Name*</label>
                      <input type="text" required name="clientName" value={formData.clientName} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Acme Corp" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Status</label>
                      <select name="currentStatus" value={formData.currentStatus} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="New Lead">New Lead</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Interested">Interested</option>
                        <option value="Follow up needed">Follow-Up Needed</option>
                        <option value="Quotation Sent">Quotation Sent</option>
                        <option value="Awaiting Decision">Awaiting Decision</option>
                        <option value="Token Recieved">Token Recieved</option>
                        <option value="Deal Closed">Converted (Deal Won)</option>
                        <option value="Deal Lost">Not Interested (Deal Lost)</option>
                      </select>
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Priority</label>
                      <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="" disabled>Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Lead Type</label>
                      <select name="leadType" value={formData.leadType} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="Clinic">Clinic</option>
                        <option value="Physiotherapist">Physiotherapist</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {formData.leadType === 'Other' && (
                      <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                        <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Custom Type</label>
                        <input type="text" required name="customLeadType" value={formData.customLeadType} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="Specify type" />
                      </div>
                    )}

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Place</label>
                      <input type="text" name="place" value={formData.place} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="City or State" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Country</label>
                      <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="Country" />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-1 mt-6 lg:mt-0">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Contact & Pipeline</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Contact Name</label>
                      <input type="text" name="personOfContact" value={formData.personOfContact} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="Primary Contact" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Role / Title</label>
                      <input type="text" name="pocDesignation" value={formData.pocDesignation} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Director" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Phone Number*</label>
                      <input type="text" required name="contactNo" value={formData.contactNo} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="+1 (555) 000-0000" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="email@example.com" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Referral Source</label>
                      <input type="text" name="referralPerson" value={formData.referralPerson} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Website, Partner" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Quoted Price</label>
                      <input type="number" name="fPrice" value={formData.fPrice} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="0.00" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Agreed Price</label>
                      <input type="number" name="lPrice" value={formData.lPrice} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="0.00" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Next Follow-Up</label>
                      <input type="date" name="nextFollowUp" value={formData.nextFollowUp} onChange={handleInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Notes & Remarks</h3>
                  <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows="3" className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Add any additional context, meeting notes, or internal remarks here..."></textarea>
                </div>
              </div>

              <div className="p-4 sm:px-8 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingLeadId(null);
                  setFormData({ date: new Date().toISOString().split('T')[0], clientName: '', name: '', priority: '', place: '', country: '', personOfContact: '', pocDesignation: '', contactNo: '', personOfContact2: '', contactNo2: '', referralPerson: '', email: '', currentStatus: 'New Lead', fPrice: '', lPrice: '', lastContacted: '', nextFollowUp: '', remarks: '', leadType: 'Clinic', customLeadType: '', assignedToName: isAdmin ? '' : (employeeData?.name || ''), message: '' });
                }} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingLeadId ? 'Save Changes' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Ad Lead Modal */}
      {isAdLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAdLeadModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-[18px] font-semibold text-zinc-900">{editingLeadId ? 'Edit Ad Lead' : 'New Ad Lead'}</h2>
              <button type="button" onClick={() => {
                if (!isSubmitting) {
                  setIsAdLeadModalOpen(false);
                  setEditingLeadId(null);
                  setAdLeadFormData({ name: '', institutionName: '', contactNumber: '', region: '', leadType: '', customLeadType: '', priority: 'Medium', remarks: '', followUpDate: '', assignedToUid: '', assignedToName: '', message: '' });
                }
              }} className="text-zinc-400 hover:text-black transition-colors p-1 bg-white rounded-full shadow-sm border border-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdLead} className="flex flex-col max-h-[85vh]">
              <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar flex-1 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2">
                  
                  {/* Left Column */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Core Details</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Contact Name*</label>
                      <input type="text" required name="name" value={adLeadFormData.name} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Dr. Arun Kumar" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Institution</label>
                      <input type="text" name="institutionName" value={adLeadFormData.institutionName} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. City Hospital" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Contact No*</label>
                      <input type="text" required name="contactNumber" value={adLeadFormData.contactNumber} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="+91 98765 43210" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Region</label>
                      <input type="text" name="region" value={adLeadFormData.region} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Ernakulam" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Lead Type*</label>
                      <select required name="leadType" value={adLeadFormData.leadType} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="" disabled>Select Type</option>
                        <option value="Hospital">Hospital</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Physiotherapist">Physiotherapist</option>
                        <option value="Clinic">Clinic</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Nursing Home">Nursing Home</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {adLeadFormData.leadType === 'Other' && (
                      <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                        <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Specify Type*</label>
                        <input type="text" required name="customLeadType" value={adLeadFormData.customLeadType} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. Rehab Center" />
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-1 mt-6 lg:mt-0">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Tracking & Assignment</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Priority</label>
                      <select name="priority" value={adLeadFormData.priority} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="Urgent">⚡ Urgent</option>
                        <option value="High">🔴 High</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">🟢 Low</option>
                      </select>
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Follow-Up Date</label>
                      <input type="date" name="followUpDate" value={adLeadFormData.followUpDate} onChange={handleAdLeadInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none" />
                    </div>

                    {(isAdmin || isManager) && (
                      <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                        <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Assign To*</label>
                        <select 
                          required 
                          name="assignedToUid" 
                          value={adLeadFormData.assignedToUid} 
                          onChange={(e) => {
                            const emp = allEmployees.find(emp => emp.uid === e.target.value);
                            setAdLeadFormData(prev => ({
                              ...prev,
                              assignedToUid: e.target.value,
                              assignedToName: emp ? (emp.name || emp.empName) : ''
                            }));
                          }} 
                          className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>Select Employee</option>
                          {allEmployees.map(emp => (
                            <option key={emp.uid} value={emp.uid}>{emp.name || emp.empName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Context & Details</h3>
                    <textarea name="message" value={adLeadFormData.message} onChange={handleAdLeadInputChange} rows="2" className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="What did the lead enquire about? Any context from the ad..."></textarea>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Internal Remarks</h3>
                    <textarea name="remarks" value={adLeadFormData.remarks} onChange={handleAdLeadInputChange} rows="2" className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Internal notes for the team..."></textarea>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-8 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsAdLeadModalOpen(false);
                  setEditingLeadId(null);
                  setAdLeadFormData({ name: '', institutionName: '', contactNumber: '', region: '', leadType: '', customLeadType: '', priority: 'Medium', remarks: '', followUpDate: '', assignedToUid: '', assignedToName: '', message: '' });
                }} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingLeadId ? 'Save Changes' : 'Create Ad Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Distributor Modal */}
      {isDistributorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsDistributorModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-[18px] font-semibold text-zinc-900">{editingLeadId ? 'Edit Distributor' : 'New Distributor'}</h2>
              <button type="button" onClick={() => {
                if (!isSubmitting) {
                  setIsDistributorModalOpen(false);
                  setEditingLeadId(null);
                  setDistributorFormData({ distributorName: '', state: '', region: '', exclusive: '', teamSize: '', contactPersonName: '', contactNumber: '', email: '', address: '', gstNumber: '', establishedYear: '', currentStatus: 'Contacted', lastMeetingDate: new Date().toISOString().split('T')[0], nextFollowUp: '', productLinesHandled: '', territoryDescription: '', remarks: '' });
                }
              }} className="text-zinc-400 hover:text-black transition-colors p-1 bg-white rounded-full shadow-sm border border-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDistributor} className="flex flex-col max-h-[85vh]">
              <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar flex-1 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2">
                  
                  {/* Left Column */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Distributor Profile</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Firm Name*</label>
                      <input type="text" required name="distributorName" value={distributorFormData.distributorName} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. MedSupply Co." />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">State*</label>
                      <select required name="state" value={distributorFormData.state} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="" disabled>Select State</option>
                        {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Region</label>
                      <input type="text" name="region" value={distributorFormData.region} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. North, South" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Exclusive?</label>
                      <select name="exclusive" value={distributorFormData.exclusive} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none cursor-pointer">
                        <option value="" disabled>Select</option>
                        <option value="Yes">Yes – Exclusive</option>
                        <option value="No">No – Non-exclusive</option>
                      </select>
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Team Size</label>
                      <input type="number" min="1" name="teamSize" value={distributorFormData.teamSize} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="No. of reps" />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-1 mt-6 lg:mt-0">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Contact & Legal</h3>
                    
                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Contact Name*</label>
                      <input type="text" required name="contactPersonName" value={distributorFormData.contactPersonName} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="Primary Contact" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Contact No*</label>
                      <input type="tel" required name="contactNumber" value={distributorFormData.contactNumber} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Email</label>
                      <input type="email" name="email" value={distributorFormData.email} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">GST Number</label>
                      <input type="text" name="gstNumber" value={distributorFormData.gstNumber} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" />
                    </div>

                    <div className="flex items-center py-2.5 border-b border-zinc-100 focus-within:border-black transition-colors group">
                      <label className="w-2/5 text-[12px] font-semibold text-zinc-500 group-focus-within:text-black transition-colors">Year Est.</label>
                      <input type="number" name="establishedYear" value={distributorFormData.establishedYear} onChange={handleDistributorInputChange} className="w-3/5 bg-transparent text-[14px] font-medium text-zinc-900 focus:outline-none placeholder:text-zinc-300" placeholder="e.g. 2010" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Business Coverage</h3>
                    <textarea name="productLinesHandled" value={distributorFormData.productLinesHandled} onChange={handleDistributorInputChange} rows="2" className="w-full mb-3 bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Product Lines Handled (e.g. Surgical instruments)"></textarea>
                    <textarea name="territoryDescription" value={distributorFormData.territoryDescription} onChange={handleDistributorInputChange} rows="2" className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Territory / Coverage Description (e.g. All districts in Kerala)"></textarea>
                    <textarea name="address" value={distributorFormData.address} onChange={handleDistributorInputChange} rows="2" className="w-full mt-3 bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Full Postal Address"></textarea>
                  </div>
                  
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100">Status & Tracking</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Current Status</label>
                        <select name="currentStatus" value={distributorFormData.currentStatus} onChange={handleDistributorInputChange} className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors cursor-pointer">
                          <option value="Haven't yet contacted">Haven't yet contacted</option>
                          <option value="Called, no response">Called, no response</option>
                          <option value="Contacted and discussed via phone">Contacted and discussed via phone</option>
                          <option value="Online demo done">Online demo done</option>
                          <option value="Live demo done">Live demo done</option>
                          <option value="Hospital presentation done">Hospital presentation done</option>
                          <option value="Agreement Sent & awaiting response">Agreement Sent & waiting</option>
                          <option value="Agreement Signed">Agreement Signed</option>
                          <option value="Purchased Demo Piece">Purchased Demo Piece</option>
                          <option value="Doing Sales">Doing Sales</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Last Meeting Date</label>
                        <input type="date" name="lastMeetingDate" value={distributorFormData.lastMeetingDate} onChange={handleDistributorInputChange} className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Next Follow-Up</label>
                        <input type="date" name="nextFollowUp" value={distributorFormData.nextFollowUp} onChange={handleDistributorInputChange} className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" />
                      </div>
                    </div>
                    <textarea name="remarks" value={distributorFormData.remarks} onChange={handleDistributorInputChange} rows="2" className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 text-[14px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400" placeholder="Internal remarks & notes..."></textarea>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-8 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsDistributorModalOpen(false);
                  setEditingLeadId(null);
                  setDistributorFormData({ distributorName: '', state: '', region: '', exclusive: '', teamSize: '', contactPersonName: '', contactNumber: '', email: '', address: '', gstNumber: '', establishedYear: '', currentStatus: 'Contacted', lastMeetingDate: new Date().toISOString().split('T')[0], nextFollowUp: '', productLinesHandled: '', territoryDescription: '', remarks: '' });
                }} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingLeadId ? 'Save Changes' : 'Add Distributor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
