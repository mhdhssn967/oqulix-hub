import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Plus, X, UserCog, Mail, Phone, Briefcase, KeyRound, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Employees() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
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
    assignedRegions: ''
  });

  // Fetch existing employees
  const fetchEmployees = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, `userData/${user.uid}/employees`));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (editingEmployeeId) {
        const updateData = {
          name: formData.name,
          position: formData.position,
          phone: formData.phone,
          assignedRegions: formData.assignedRegions
        };
        await setDoc(doc(db, `userData/${user.uid}/employees`, editingEmployeeId), updateData, { merge: true });
        
        await setDoc(doc(db, 'employees', editingEmployeeId), {
          name: formData.name
        }, { merge: true });
        
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
          createdAt: serverTimestamp(),
          userId: employeeId
        };
        await setDoc(doc(db, `userData/${user.uid}/employees`, employeeId), employeeData);

        await setDoc(doc(db, 'employees', employeeId), {
          name: formData.name,
          email: formData.email,
          companyid: user.uid,
          userId: employeeId
        });

        await signOut(secondaryAuth);
      }

      setIsModalOpen(false);
      setEditingEmployeeId(null);
      setFormData({ name: '', position: '', phone: '', email: '', password: '', assignedRegions: '' });
      fetchEmployees();
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
            setFormData({ name: '', position: '', phone: '', email: '', password: '', assignedRegions: '' });
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
                      assignedRegions: emp.assignedRegions || ''
                    });
                    setEditingEmployeeId(emp.id);
                    setIsModalOpen(true);
                  }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[12px]">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[14px] font-semibold text-zinc-900">{emp.name}</span>
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
          <div  className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{maxWidth:'500px'}}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-100" >
              <h2 className="text-[15px] font-semibold text-zinc-900">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button type="button" onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-4 flex flex-col gap-3">
              {error && (
                <div className="p-2.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-medium flex items-start gap-1.5 border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" required name="name" value={formData.name} onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Position / Role</label>
                <input 
                  type="text" required name="position" value={formData.position} onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                  placeholder="Sales Associate"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="tel" required name="phone" value={formData.phone} onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Assigned Regions</label>
                <input 
                  type="text" name="assignedRegions" value={formData.assignedRegions} onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all"
                  placeholder="e.g. Ernakulam, Thrissur (Comma separated)"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" required name="email" value={formData.email} onChange={handleInputChange}
                  disabled={!!editingEmployeeId}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Account Password</label>
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 mt-1">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="flex-1 py-2 px-3 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2 px-3 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingEmployeeId ? 'Save Changes' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
