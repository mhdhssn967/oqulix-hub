import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Plus, X, UserCog, Mail, Phone, Briefcase, KeyRound, Loader2, AlertCircle, Eye, EyeOff, MonitorSmartphone } from 'lucide-react';

export default function Employees() {
  const { user, companyId } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [rolesData, setRolesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    password: '',
    assignedRegions: '',
    permissions: [],
    dateOfJoining: '',
    isActive: true
  });

  const availablePermissions = [
    "CRM", "CRM Analysis", "Finance", "Clients", "Reimbursements", "Tasks", 
    "Attendance", "Employees", "Performance", "Documents", "Settings",
    "Assets", "Company Info", "Vault", "Payroll Management"
  ];

  // Fetch existing employees and roles
  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, `userData/${companyId}/employees`));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
      
      const rolesSnap = await getDocs(collection(db, 'users'));
      const roles = {};
      rolesSnap.forEach(rDoc => {
        roles[rDoc.id] = rDoc.data().permissions || [];
      });
      setRolesData(roles);

      const assetsSnap = await getDocs(collection(db, `userData/${companyId}/assets`));
      const assetsData = assetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(assetsData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    const roleId = newRole.trim().toLowerCase().replace(/\s+/g, '');
    let permissions = formData.permissions || [];
    if (rolesData[roleId]) {
      permissions = rolesData[roleId];
    }
    setFormData(prev => ({ ...prev, position: newRole, permissions }));
  };

  const handlePermissionToggle = (perm) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (editingEmployeeId) {
        const updateData = {
          name: formData.name,
          position: formData.position,
          phone: formData.phone,
          assignedRegions: formData.assignedRegions,
          permissions: formData.permissions,
          dateOfJoining: formData.dateOfJoining || '',
          isActive: formData.isActive !== false
        };
        await setDoc(doc(db, `userData/${companyId}/employees`, editingEmployeeId), updateData, { merge: true });
        
        await setDoc(doc(db, 'employees', editingEmployeeId), {
          name: formData.name,
          permissions: formData.permissions
        }, { merge: true });
        
        if (formData.position) {
          const roleId = formData.position.trim().toLowerCase().replace(/\s+/g, '');
          await setDoc(doc(db, 'users', roleId), {
            userIds: arrayUnion(editingEmployeeId),
            permissions: formData.permissions
          }, { merge: true });
        }
        
      } else {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const employeeId = userCredential.user.uid;

        const employeeData = {
          name: formData.name,
          position: formData.position,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          assignedRegions: formData.assignedRegions,
          permissions: formData.permissions,
          dateOfJoining: formData.dateOfJoining || '',
          isActive: formData.isActive !== false,
          createdAt: serverTimestamp(),
          userId: employeeId
        };
        await setDoc(doc(db, `userData/${companyId}/employees`, employeeId), employeeData);

        await setDoc(doc(db, 'employees', employeeId), {
          name: formData.name,
          email: formData.email,
          companyid: companyId,
          userId: employeeId,
          permissions: formData.permissions
        });

        if (formData.position) {
          const roleId = formData.position.trim().toLowerCase().replace(/\s+/g, '');
          await setDoc(doc(db, 'users', roleId), {
            userIds: arrayUnion(employeeId),
            permissions: formData.permissions
          }, { merge: true });
        }

        await signOut(secondaryAuth);
      }

      setIsModalOpen(false);
      setEditingEmployeeId(null);
      setFormData({ name: '', position: '', phone: '', email: '', password: '', assignedRegions: '', permissions: [] });
      fetchData();
    } catch (err) {
      console.error("Error adding employee:", err);
      setError(err.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Employees</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Manage your team and staff access.</p>
        </div>
        <button
          onClick={() => {
            setEditingEmployeeId(null);
            setFormData({ name: '', position: '', phone: '', email: '', password: '', assignedRegions: '', permissions: [] });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </header>

      {/* Employee List */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-[14px]">
            <UserCog className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            No employees found. Add your first employee to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Position & Regions</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => {
                    setFormData({
                      name: emp.name || '',
                      position: emp.position || '',
                      phone: emp.phone || '',
                      email: emp.email || '',
                      password: emp.password || '',
                      assignedRegions: emp.assignedRegions || '',
                      permissions: emp.permissions || [],
                      dateOfJoining: emp.dateOfJoining || '',
                      isActive: emp.isActive !== false
                    });
                    setEditingEmployeeId(emp.id);
                    setIsModalOpen(true);
                  }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[12px]">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-zinc-900">{emp.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${emp.isActive !== false ? 'text-emerald-500' : 'text-red-500'}`}>
                            {emp.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-[12px] font-medium">
                          <Briefcase className="w-3.5 h-3.5" />
                          {emp.position}
                        </span>
                        {emp.assignedRegions && (
                          <div className="text-[12px] text-zinc-500 max-w-[200px] truncate" title={emp.assignedRegions}>
                            <span className="font-semibold">Regions:</span> {emp.assignedRegions}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[13px] text-zinc-600">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          {emp.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-[13px] text-zinc-600">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          {emp.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[13px] text-zinc-500 font-mono bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100 min-w-[100px]">
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{visiblePasswords[emp.id] ? emp.password : '••••••••'}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePasswordVisibility(emp.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-md hover:bg-zinc-100"
                          title={visiblePasswords[emp.id] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[emp.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{maxWidth:'850px'}}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-100" >
              <h2 className="text-[16px] font-semibold text-zinc-900">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button type="button" onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors bg-zinc-100 hover:bg-zinc-200 p-1.5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[13px] font-medium flex items-start gap-2 border border-red-100 mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - General Info */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">General Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input 
                        type="text" required name="name" value={formData.name} onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Position / Title</label>
                      <input 
                        type="text" required name="position" value={formData.position} onChange={handleRoleChange}
                        list="roles-list"
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                        placeholder="Sales Associate"
                      />
                      <datalist id="roles-list">
                        {Object.keys(rolesData).map(roleId => (
                          <option key={roleId} value={roleId} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input 
                        type="tel" required name="phone" value={formData.phone} onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Assigned Regions</label>
                      <input 
                        type="text" name="assignedRegions" value={formData.assignedRegions} onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                        placeholder="North, South (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Date of Joining</label>
                      <input 
                        type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                      />
                    </div>
                  </div>

                  <h3 className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2 mt-2">Account Credentials</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input 
                        type="email" required name="email" value={formData.email} onChange={handleInputChange}
                        disabled={!!editingEmployeeId}
                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Account Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} required={!editingEmployeeId} minLength="6" name="password" value={formData.password} onChange={handleInputChange}
                          disabled={!!editingEmployeeId}
                          className="w-full pl-3 pr-10 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Min. 6 characters"
                        />
                        {!editingEmployeeId && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors bg-white hover:bg-zinc-100 rounded-md shadow-sm border border-zinc-100"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Permissions & Status */}
                <div className="flex flex-col h-full bg-zinc-50/50 p-4 rounded-xl border border-zinc-200/60 justify-between">
                  <div className="pt-2">
                    <h3 className="text-[12px] font-bold text-zinc-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-zinc-400" />
                      Access Permissions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {availablePermissions.map((perm) => {
                        const currentRoleId = formData.position.trim().toLowerCase().replace(/\s+/g, '');
                        const isExistingRole = !!rolesData[currentRoleId];
                        const isChecked = isExistingRole 
                          ? (rolesData[currentRoleId] || []).includes(perm)
                          : formData.permissions.includes(perm);
                        
                        return (
                          <button
                            key={perm}
                            type="button"
                            disabled={isExistingRole}
                            onClick={() => handlePermissionToggle(perm)}
                            className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                              isChecked 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                            } ${isExistingRole ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {perm}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50 flex items-start gap-2 text-blue-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                      <p className="text-[11px] leading-relaxed">
                        {!!rolesData[formData.position.trim().toLowerCase().replace(/\s+/g, '')] 
                          ? "Permissions are locked because this is an existing title. All users with this title share these permissions." 
                          : "Select permissions for this new title. Future users with this title will automatically inherit these."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-200/60 flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-zinc-900">Account Status</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Active employees can log in and be assigned to tasks.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                      />
                      <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 mt-6 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="py-2.5 px-6 text-[13px] font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 rounded-xl transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-8 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingEmployeeId ? 'Update Details' : 'Add Employee')}
                </button>
              </div>
            </form>

            {editingEmployeeId && (
              <div className="p-4 bg-zinc-50 border-t border-zinc-100">
                <h3 className="text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MonitorSmartphone className="w-4 h-4" />
                  Assets Currently Handled
                </h3>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {assets.filter(a => a.handledBy === editingEmployeeId).length > 0 ? (
                    assets.filter(a => a.handledBy === editingEmployeeId).map(asset => (
                      <div key={asset.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm flex justify-between items-start">
                        <div>
                          <div className="text-[13px] font-bold text-zinc-900">{asset.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{asset.type} • {asset.id}</div>
                          {asset.history?.filter(h => h.employee === editingEmployeeId && h.action !== 'Returned').sort((a, b) => b.date.seconds - a.date.seconds)[0] && (
                            <div className="text-[10px] text-zinc-400 mt-1">
                              Handed over on: {new Date(asset.history.filter(h => h.employee === editingEmployeeId && h.action !== 'Returned').sort((a, b) => b.date.seconds - a.date.seconds)[0].date.seconds * 1000).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${asset.status === 'Under Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {asset.status}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-600 bg-zinc-50">
                            {asset.condition}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[12px] text-zinc-500 italic">No assets assigned.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
