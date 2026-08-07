import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import { Plus, X, Calendar, CheckCircle, Trash2, ArrowRight, LayoutGrid, List } from 'lucide-react';

export default function TaskManagement() {
  const { user, companyId } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterPerson, setFilterPerson] = useState('All');
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
    if (filterStatus !== 'All' && task.status !== filterStatus) return false;
    if (filterPriority !== 'All' && task.priority !== filterPriority) return false;
    if (filterPerson !== 'All' && task.assignedToName !== filterPerson) return false;
    return true;
  });

  return (
    <div className="flex flex-col pb-10 min-h-screen p-6 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Task Manager</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Manage tasks for all employees.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-black text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4 sm:w-4 sm:h-4" />
          Assign Task
        </button>
      </header>

      {/* Tabs and Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3 xl:gap-6 overflow-x-auto hide-scrollbar pb-2 xl:pb-0 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'To Do', 'In Progress', 'Completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    filterStatus === status 
                      ? status === 'Completed' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                        : status === 'In Progress' ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/20'
                        : status === 'To Do' ? 'bg-zinc-700 text-white border-zinc-700 shadow-md shadow-zinc-500/20'
                        : 'bg-black text-white border-black shadow-md'
                      : status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100'
                        : status === 'In Progress' ? 'bg-purple-50 text-purple-700 border-purple-200/60 hover:bg-purple-100'
                        : status === 'To Do' ? 'bg-zinc-100 text-zinc-700 border-zinc-200/60 hover:bg-zinc-200'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
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
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <CheckCircle className="w-12 h-12 text-zinc-300 mb-4" />
            <h3 className="text-base font-semibold text-zinc-900 mb-1">No Tasks Found</h3>
            <p className="text-sm text-zinc-500">There are no tasks matching your filters.</p>
          </div>
        ) : (
          viewMode === 'list' ? (
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/50">
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12 text-center">#</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Task</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Assigned To</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Due Date</th>
                    <th className="py-3 px-5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {currentList.map((task, index) => (
                    <tr key={task.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="py-4 px-5 text-sm font-medium text-zinc-400 text-center">
                        {index + 1}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-zinc-900 text-sm mb-1">{task.title}</div>
                        {task.description && (
                          <div className="text-[13px] text-zinc-500 line-clamp-1 max-w-md">{task.description}</div>
                        )}
                        {task.completionNote && (
                          <div className="text-[12px] text-emerald-600 font-medium line-clamp-1 max-w-md mt-1">Note: {task.completionNote}</div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full border whitespace-nowrap ${
                          task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                          task.status === 'In Progress' ? 'bg-purple-50 text-purple-700 border-purple-200/60' :
                          'bg-zinc-100 text-zinc-700 border-zinc-200/60'
                        }`}>
                          {task.status}
                        </span>
                        {task.totalTimeSpentMs > 0 && (
                          <div className="text-[11px] font-medium text-zinc-500 mt-2">
                            Time spent: {Math.floor(task.totalTimeSpentMs / 3600000)}h {Math.floor((task.totalTimeSpentMs % 3600000) / 60000)}m
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full border whitespace-nowrap ${
                          task.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200/60' :
                          task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                          'bg-blue-50 text-blue-700 border-blue-200/60'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-medium text-zinc-800">
                          {task.assignedToName}
                        </span>
                        <div className="text-[11px] text-zinc-500">By: {task.assignedByName}</div>
                      </td>
                      <td className="py-4 px-5">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1.5 text-zinc-600">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[13px] font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {task.status !== 'Completed' && (
                            <>
                              {task.status === 'To Do' && (
                                <button onClick={() => updateStatus(task, 'In Progress')} className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors rounded-lg text-xs font-semibold">
                                  Start
                                </button>
                              )}
                              {task.status === 'In Progress' && (
                                <button onClick={() => updateStatus(task, 'To Do')} className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors rounded-lg text-xs font-semibold">
                                  Stop
                                </button>
                              )}
                              {(task.status === 'To Do' || task.status === 'In Progress') && (
                                <button onClick={() => setCompletingTask(task)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-xs font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Complete
                                </button>
                              )}
                            </>
                          )}
                          <button onClick={() => deleteTask(task.id)} title="Delete Task" className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
              {['To Do', 'In Progress', 'Completed'].map(columnStatus => {
                const columnTasks = currentList.filter(t => t.status === columnStatus);
                return (
                  <div key={columnStatus} className="bg-zinc-100/50 rounded-2xl p-4 min-h-[500px] border border-zinc-200/80 flex flex-col gap-4">
                    <div className="flex items-center justify-between shrink-0 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          columnStatus === 'Completed' ? 'bg-emerald-500' :
                          columnStatus === 'In Progress' ? 'bg-purple-500' :
                          'bg-zinc-400'
                        }`} />
                        <h3 className="font-bold text-zinc-900 text-[15px]">{columnStatus}</h3>
                      </div>
                      <span className="bg-white text-zinc-600 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm border border-zinc-200">{columnTasks.length}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {columnTasks.map(task => (
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
                          
                          <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
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
                            
                            {(task.completionNote || task.totalTimeSpentMs > 0) && (
                              <div className="flex flex-col gap-1 mt-1 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                {task.completionNote && (
                                  <div className="text-[11px] text-emerald-600 font-medium line-clamp-1">Note: {task.completionNote}</div>
                                )}
                                {task.totalTimeSpentMs > 0 && (
                                  <div className="text-[10px] font-medium text-zinc-500">
                                    Time spent: {Math.floor(task.totalTimeSpentMs / 3600000)}h {Math.floor((task.totalTimeSpentMs % 3600000) / 60000)}m
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {task.status !== 'Completed' && (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {task.status === 'To Do' && (
                                <button onClick={() => updateStatus(task, 'In Progress')} className="col-span-1 px-2 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors rounded-lg text-[11px] font-semibold text-center">
                                  Start Task
                                </button>
                              )}
                              {task.status === 'In Progress' && (
                                <button onClick={() => updateStatus(task, 'To Do')} className="col-span-1 px-2 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors rounded-lg text-[11px] font-semibold text-center">
                                  Pause
                                </button>
                              )}
                              <button onClick={() => setCompletingTask(task)} className={`px-2 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-[11px] font-semibold text-center flex items-center justify-center gap-1 ${task.status === 'In Progress' ? 'col-span-1' : 'col-span-2'}`}>
                                <CheckCircle className="w-3 h-3" /> Complete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="flex items-center justify-center py-10 border-2 border-dashed border-zinc-200/80 rounded-xl">
                          <span className="text-xs font-medium text-zinc-400">No tasks</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Assign New Task</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Fill in the details to assign a task.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors p-1 bg-zinc-50 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Task Title*</label>
                <input type="text" required name="title" value={formData.title} onChange={handleInputChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all" placeholder="What needs to be done?" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none" placeholder="Provide additional details..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Assign To*</label>
                <select required name="assignedToUid" value={formData.assignedToUid} onChange={handleInputChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer">
                  <option value="" disabled>Select an employee</option>
                  <option value={user?.uid}>Assign to Myself</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Due Date</label>
                  <input type="date" name="dueDate" value={formData.dueDate} onChange={handleInputChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all" />
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-3 shrink-0 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? 'Assigning...' : 'Assign Task'}
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setCompletingTask(null)}></div>
          
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Complete Task</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Describe what you have done.</p>
              </div>
              <button onClick={() => setCompletingTask(null)} className="text-zinc-400 hover:text-black transition-colors p-1 bg-zinc-50 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCompleteTask} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Completion Notes</label>
                <textarea 
                  value={completionNote} 
                  onChange={(e) => setCompletionNote(e.target.value)} 
                  rows={4} 
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none" 
                  placeholder="I have finished the report... (optional)" 
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setCompletingTask(null)} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? 'Completing...' : 'Mark as Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
