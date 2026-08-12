import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import { Plus, X, Calendar, CheckCircle, Trash2, ArrowLeft, Search, LayoutGrid, List } from 'lucide-react';

export default function TaskManagement() {
  const navigate = useNavigate();
  const { user, companyId } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterPerson, setFilterPerson] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'list' | 'kanban'
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNote, setCompletionNote] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    assignedToUid: ''
  });

  useEffect(() => {
    fetchData();
  }, [companyId, user]);

  const fetchData = async () => {
    if (!companyId || !user?.uid) return;
    setLoading(true);
    try {
      // 1. Fetch Employees
      const empsRef = collection(db, 'userData', companyId, 'employees');
      const empsSnap = await getDocs(empsRef);
      const empsList = empsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empsList);

      // 2. Fetch All Tasks
      const tasksRef = collection(db, 'userData', companyId, 'tasks');
      const q = query(tasksRef);
      const tasksSnap = await getDocs(q);
      
      const allTasks = [];
      
      tasksSnap.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        
        const assignee = empsList.find(e => e.id === data.assignedToUid);
        const assigner = empsList.find(e => e.id === data.assignedByUid);
        
        data.assignedToName = assignee ? (assignee.name || assignee.email) : (data.assignedToName || 'Unknown');
        
        if (assigner) {
          data.assignedByName = assigner.name || assigner.email;
        } else {
          data.assignedByName = data.assignedByName || (data.assignedByEmail ? data.assignedByEmail.split('@')[0] : 'Someone');
        }

        allTasks.push(data);
      });

      // Sort by creation date descending
      allTasks.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

      setTasks(allTasks);

    } catch (error) {
      console.error("Error fetching tasks data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    
    if (!formData.title.trim() || !formData.assignedToUid) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Task title and Assignee are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedUser = employees.find(emp => emp.id === formData.assignedToUid);
      
      let assignerName = user.displayName || user.email;
      const myEmpDoc = employees.find(emp => emp.uid === user.uid);
      if (myEmpDoc) {
        assignerName = myEmpDoc.name;
      }

      let assigneeName = 'Unknown';
      if (formData.assignedToUid === user.uid) {
        assigneeName = assignerName;
      } else if (assignedUser) {
        assigneeName = assignedUser.name;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
        assignedToUid: formData.assignedToUid,
        assignedToName: assigneeName,
        assignedByUid: user.uid,
        assignedByName: assignerName,
        status: 'To Do',
        createdAt: serverTimestamp(),
      };

      const tasksRef = collection(db, 'userData', companyId, 'tasks');
      const newDocRef = doc(tasksRef);
      await setDoc(newDocRef, payload);

      Swal.fire({ icon: 'success', title: 'Success', text: 'Task assigned successfully.', timer: 1500, showConfirmButton: false });
      setIsModalOpen(false);
      setFormData({ title: '', description: '', priority: 'Medium', dueDate: '', assignedToUid: '' });
      fetchData();
    } catch (error) {
      console.error("Error adding task:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to add task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (task, newStatus) => {
    try {
      const taskRef = doc(db, 'userData', companyId, 'tasks', task.id);
      const updateData = { status: newStatus };
      
      if (newStatus === 'In Progress') {
        updateData.startedAt = serverTimestamp();
      } else if (newStatus === 'To Do' && task.status === 'In Progress' && task.startedAt) {
        const startedMillis = task.startedAt.toMillis ? task.startedAt.toMillis() : (task.startedAt.seconds * 1000);
        const timeSpent = Date.now() - startedMillis;
        updateData.totalTimeSpentMs = (task.totalTimeSpentMs || 0) + timeSpent;
      }
      
      await updateDoc(taskRef, updateData);
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update task status.' });
    }
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    if (!completingTask) return;
    
    setIsSubmitting(true);
    try {
      const taskRef = doc(db, 'userData', companyId, 'tasks', completingTask.id);
      const updateData = { 
        status: 'Completed',
        completionNote: completionNote,
        completedAt: serverTimestamp()
      };
      
      if (completingTask.status === 'In Progress' && completingTask.startedAt) {
        const startedMillis = completingTask.startedAt.toMillis ? completingTask.startedAt.toMillis() : (completingTask.startedAt.seconds * 1000);
        const timeSpent = Date.now() - startedMillis;
        updateData.totalTimeSpentMs = (completingTask.totalTimeSpentMs || 0) + timeSpent;
      }
      
      await updateDoc(taskRef, updateData);
      Swal.fire({ icon: 'success', title: 'Task Completed', text: 'Task marked as completed successfully.', timer: 1500, showConfirmButton: false });
      setCompletingTask(null);
      setCompletionNote('');
      fetchData();
    } catch (error) {
      console.error("Error completing task:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to complete task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTask = async (taskId) => {
    const result = await Swal.fire({
      title: 'Are you sure?', text: 'You will not be able to recover this task!', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#000', cancelButtonColor: '#e4e4e7', confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'userData', companyId, 'tasks', taskId));
        Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Your task has been deleted.', timer: 1500, showConfirmButton: false });
        fetchData();
      } catch (error) {
        console.error("Error deleting task:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete task.' });
      }
    }
  };

  const uniquePeople = [...new Set(tasks.map(task => task.assignedToName))].filter(Boolean).sort();

  const currentList = tasks.filter(task => {
    if (task.status !== 'Completed') return false;
    if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
    if (filterPerson !== 'All' && task.assignedToName !== filterPerson) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = task.title?.toLowerCase().includes(q);
      const matchesDesc = task.description?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col pb-10 min-h-screen p-6 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/task-manager')} 
            className="p-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 hover:text-black transition-colors shadow-sm self-start mt-1"
            title="Back to Task Manager"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-black tracking-tight">Completed Tasks</h1>
            <p className="text-[15px] text-zinc-500 mt-1.5">View all completed tasks across the team.</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3 xl:gap-6 overflow-x-auto hide-scrollbar pb-2 xl:pb-0 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'High', 'Medium', 'Low'].map(priority => (
                <button
                  key={priority}
                  onClick={() => setFilterPriority(priority)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    filterPriority === priority 
                      ? priority === 'High' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                        : priority === 'Medium' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : priority === 'Low' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-black text-white border-black shadow-md'
                      : priority === 'High' ? 'bg-red-50 text-red-700 border-red-200/60 hover:bg-red-100'
                        : priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100'
                        : priority === 'Low' ? 'bg-blue-50 text-blue-700 border-blue-200/60 hover:bg-blue-100'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block whitespace-nowrap">
              Employee
            </span>
            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="bg-zinc-100/80 border-none text-xs font-semibold rounded-lg px-3 py-1.5 text-zinc-700 focus:ring-0 cursor-pointer outline-none hover:bg-zinc-200/80 transition-colors md:w-auto max-w-[150px] truncate"
            >
              <option value="All">All People</option>
              {uniquePeople.map(person => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 w-full xl:w-auto relative ml-auto">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
            <input 
              type="text" 
              placeholder="Search completed tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full xl:w-64 bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors shadow-sm"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100/80 p-1 rounded-xl ml-auto border border-zinc-200/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'kanban' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentList.map(task => (
          <div key={task.id} className="bg-white rounded-xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-zinc-200/60 hover:shadow-md transition-shadow group flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md border whitespace-nowrap ${
                task.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200/60' :
                task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                'bg-blue-50 text-blue-700 border-blue-200/60'
              }`}>
                {task.priority}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => deleteTask(task.id)} title="Delete Task" className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 text-sm leading-tight">{task.title}</h4>
              {task.description && (
                <p className="text-[12px] text-zinc-500 line-clamp-2 mt-1.5 leading-snug">{task.description}</p>
              )}
            </div>
            
            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2 mt-auto">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-zinc-900">{task.assignedToName}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">By: {task.assignedByName}</span>
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[11px] font-medium">{new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-1 mt-1 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                {task.completedAt && (
                  <div className="text-[10px] font-bold text-emerald-600">
                    Completed: {new Date(task.completedAt.toMillis ? task.completedAt.toMillis() : (task.completedAt.seconds * 1000)).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                  </div>
                )}
                {task.completionNote && (
                  <div className="text-[11px] text-emerald-600 font-medium line-clamp-1">Note: {task.completionNote}</div>
                )}
                {task.totalTimeSpentMs > 0 && (
                  <div className="text-[10px] font-medium text-zinc-500">
                    Time spent: {Math.floor(task.totalTimeSpentMs / 3600000)}h {Math.floor((task.totalTimeSpentMs % 3600000) / 60000)}m
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {currentList.length === 0 && !loading && (
          <div className="col-span-full flex items-center justify-center py-20 border-2 border-dashed border-zinc-200/80 rounded-2xl">
            <span className="text-sm font-medium text-zinc-400">No completed tasks found.</span>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
