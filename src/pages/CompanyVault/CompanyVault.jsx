import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { Shield, Building2, Contact, MapPin, Landmark, FileBadge, KeyRound, Loader2, Search } from 'lucide-react';
import OverviewTab from './OverviewTab';
import ContactTab from './ContactTab';
import AddressesTab from './AddressesTab';
import BankAccountsTab from './BankAccountsTab';
import RegistrationsTab from './RegistrationsTab';
import CredentialsTab from './CredentialsTab';

export default function CompanyVault() {
  const { companyId, isAdmin, isManager, permissions } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState({ addresses: [], contacts: [], registrations: [] });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [credentials, setCredentials] = useState([]);
  
  // Permission checks
  const canViewVault = isAdmin || isManager || (permissions && permissions.includes('Vault'));
  const canEdit = isAdmin || isManager || (permissions && (permissions.includes('Company Info') || permissions.includes('Vault')));

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    
    // Listen to Company Info
    const detailsRef = doc(db, `userData/${companyId}/companyInfo`, 'details');
    const unsubDetails = onSnapshot(detailsRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompanyDetails(docSnap.data());
      } else {
        // Initialize if not exists
        const initial = { name: '', addresses: [], contacts: [], registrations: [] };
        setDoc(detailsRef, initial).then(() => setCompanyDetails(initial));
      }
    });

    // Listen to Bank Accounts
    const bankRef = collection(db, `userData/${companyId}/bankAccounts`);
    const unsubBanks = onSnapshot(bankRef, (snap) => {
      setBankAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to Credentials (if allowed)
    let unsubVault = () => {};
    if (canViewVault) {
      const vaultRef = collection(db, `userData/${companyId}/vault`);
      unsubVault = onSnapshot(vaultRef, (snap) => {
        setCredentials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    setLoading(false);
    return () => {
      unsubDetails();
      unsubBanks();
      unsubVault();
    };
  }, [companyId, canViewVault]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: Contact },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'bankAccounts', label: 'Bank Accounts', icon: Landmark },
    { id: 'registrations', label: 'Registrations', icon: FileBadge },
  ];

  if (canViewVault) {
    tabs.push({ id: 'credentials', label: 'Credentials', icon: KeyRound });
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-black tracking-tight">Company Vault</h1>
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-[15px] text-zinc-500 mt-1.5">Secure central repository for all company information and credentials.</p>
        </div>
        
        {/* Global Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search all info..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-sm custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-zinc-100 text-black shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-zinc-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 md:p-8 min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={companyDetails} canEdit={canEdit} searchTerm={searchTerm} />}
            {activeTab === 'contact' && <ContactTab data={companyDetails} canEdit={canEdit} searchTerm={searchTerm} />}
            {activeTab === 'addresses' && <AddressesTab data={companyDetails} canEdit={canEdit} searchTerm={searchTerm} />}
            {activeTab === 'bankAccounts' && <BankAccountsTab data={bankAccounts} canEdit={canEdit} searchTerm={searchTerm} />}
            {activeTab === 'registrations' && <RegistrationsTab data={companyDetails} canEdit={canEdit} searchTerm={searchTerm} />}
            {activeTab === 'credentials' && canViewVault && <CredentialsTab data={credentials} canEdit={canEdit} searchTerm={searchTerm} />}
          </>
        )}
      </div>
    </div>
  );
}
