
import React, { useState, useEffect } from 'react';
import { User, Trip, Vehicle, UserRole } from '../types';
import { 
  getTrips, getVehicles, getUsers, addVehicle, addUser, 
  updateUser, deleteUser, updateVehicle, deleteVehicle,
  updateTrip, deleteTrip 
} from '../services/storageService';
import { 
  LayoutDashboard, 
  Settings, 
  Download, 
  Search, 
  Truck, 
  UserPlus, 
  Plus,
  ArrowUp,
  ArrowDown,
  Calendar,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Save,
  MapPin,
  Clock,
  AlertTriangle,
  StickyNote,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

// Explicitly declare jsPDF for TypeScript since we load it via CDN
declare const jspdf: any;

interface AdminViewProps {
  user: User;
  onLogout: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters & Sorting
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all'); // New Driver Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // New Data Inputs
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('');
  
  // Add User State
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.DRIVER as UserRole
  });

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Trip Editing State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editTripStartStr, setEditTripStartStr] = useState('');
  const [editTripEndStr, setEditTripEndStr] = useState('');

  // Delete Confirmation State
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]); // Reload when tab changes

  const loadData = async () => {
    setLoading(true);
    try {
      const t = await getTrips();
      const v = await getVehicles();
      const u = await getUsers();
      setTrips(t);
      setVehicles(v);
      setUsersList(u);
    } catch (e) {
      console.error("Failed to load data", e);
      alert("Gagal memuatkan data dari awan.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (totalMinutes?: number) => {
    if (!totalMinutes && totalMinutes !== 0) return 'Aktif';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours} Jam ${minutes > 0 ? `${minutes} Minit` : ''}`;
    }
    return `${minutes} Minit`;
  };

  const getFilteredTrips = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = today - (7 * 24 * 60 * 60 * 1000);

    let filtered = trips.filter(trip => {
      // Driver Filter
      if (selectedDriverFilter !== 'all' && trip.driverId !== selectedDriverFilter) {
        return false;
      }

      // Date Filter
      let passDate = true;
      if (dateFilter === 'today') {
        passDate = trip.startTime >= today;
      } else if (dateFilter === 'week') {
        passDate = trip.startTime >= oneWeekAgo;
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate).setHours(0,0,0,0);
        const end = new Date(customEndDate).setHours(23,59,59,999);
        passDate = trip.startTime >= start && trip.startTime <= end;
      }

      // Search Filter
      const query = searchQuery.toLowerCase();
      const passSearch = 
        trip.driverName.toLowerCase().includes(query) ||
        trip.plateNumber.toLowerCase().includes(query) ||
        (trip.destination && trip.destination.toLowerCase().includes(query)) ||
        (trip.remarks && trip.remarks.toLowerCase().includes(query)) ||
        trip.origin.toLowerCase().includes(query);

      return passDate && passSearch;
    });

    // Sorting
    return filtered.sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.startTime - b.startTime 
        : b.startTime - a.startTime;
    });
  };

  const filteredTrips = getFilteredTrips();

  const handleExportPDF = () => {
    if (typeof jspdf === 'undefined') {
      alert("Modul PDF sedang dimuatkan, sila cuba sebentar lagi.");
      return;
    }

    const doc = new jspdf.jsPDF('l', 'mm', 'a4'); // Landscape for better column fit
    
    // Header
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11); // Primary color
    doc.text("KeDriver - Laporan Perjalanan", 14, 22);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Dijana oleh: ${user.name}`, 14, 30);
    doc.text(`Tarikh: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 36);

    // Filter Info in PDF
    if (selectedDriverFilter !== 'all') {
      const driverName = usersList.find(u => u.id === selectedDriverFilter)?.name || 'Unknown';
      doc.text(`Filter Pemandu: ${driverName}`, 14, 42);
    }

    // Table
    const tableData = filteredTrips.map(t => {
       const vehicle = vehicles.find(v => v.id === t.vehicleId);
       const vehicleType = vehicle ? vehicle.type : (t.vehicleModel || '-');
       const formattedEndTime = t.endTime ? format(t.endTime, 'dd/MM/yyyy hh:mm a') : '-';
       
       return [
         format(t.startTime, 'dd/MM/yyyy hh:mm a'),
         formattedEndTime,
         t.driverName,
         t.plateNumber,
         t.vehicleModel,
         t.origin + (t.destination ? ` > ${t.destination}` : ' > [Aktif]'),
         t.passengers || '-',
         t.remarks || '-',
         formatDuration(t.durationMinutes)
       ];
    });

    const startY = selectedDriverFilter !== 'all' ? 48 : 44;

    doc.autoTable({
      startY: startY,
      head: [['Mula', 'Tamat', 'Pemandu', 'Plat', 'Jenis', 'Lokasi', 'Penumpang', 'Catatan', 'Tempoh']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }, // Amber 500
      styles: { fontSize: 7, cellPadding: 2 }, // Smaller font
      columnStyles: {
        0: { cellWidth: 20 }, // Mula
        1: { cellWidth: 20 }, // Tamat
        // Pemandu
        3: { cellWidth: 20 }, // Plat
        4: { cellWidth: 20 }, // Jenis
        // Lokasi
        6: { cellWidth: 25 }, // Penumpang
        7: { cellWidth: 25 }, // Catatan
        8: { cellWidth: 20 }, // Tempoh
      }
    });

    doc.save(`Laporan_GerakJalan_${Date.now()}.pdf`);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Helper for input datetime-local
  const formatForInput = (timestamp: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    // Pad to ISO format: YYYY-MM-DDThh:mm
    const pad = (n: number) => n < 10 ? '0'+n : n;
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setEditTripStartStr(formatForInput(trip.startTime));
    setEditTripEndStr(trip.endTime ? formatForInput(trip.endTime) : '');
  };

  // --- CRUD HANDLERS ---

  const handleUpdateTrip = async () => {
    if (!editingTrip) return;

    const startTime = new Date(editTripStartStr).getTime();
    let endTime = editingTrip.endTime;
    let durationMinutes = editingTrip.durationMinutes;
    let status = editingTrip.status;

    // Logic to handle dates and duration updates
    if (editTripEndStr) {
        endTime = new Date(editTripEndStr).getTime();
        // Recalculate duration
        const durationMs = endTime - startTime;
        durationMinutes = Math.max(1, Math.round(durationMs / 60000));
        status = 'COMPLETED';
    } else {
        // If end time is cleared, set back to active
        endTime = undefined;
        durationMinutes = undefined;
        status = 'ACTIVE';
    }

    const updatedTrip: Trip = {
        ...editingTrip,
        startTime,
        endTime,
        durationMinutes,
        status
    };

    try {
        await updateTrip(updatedTrip);
        setEditingTrip(null);
        await loadData();
        alert("Perjalanan berjaya dikemaskini.");
    } catch (e) {
        alert("Gagal mengemaskini perjalanan.");
    }
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    
    try {
        await deleteTrip(tripToDelete);
        // Optimistic update
        setTrips(currentTrips => currentTrips.filter(t => t.id !== tripToDelete));
        setTripToDelete(null);
    } catch (e: any) {
        console.error("Delete Trip Error:", e);
        alert("Gagal memadam: " + e.message);
        // Reload if failed just in case
        await loadData();
        setTripToDelete(null);
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehiclePlate || !newVehicleModel) return;
    try {
      await addVehicle({
        id: '', // Generated by DB
        plateNumber: newVehiclePlate.toUpperCase(),
        model: newVehicleModel,
        type: newVehicleType || 'Kenderaan'
      });
      setNewVehiclePlate('');
      setNewVehicleModel('');
      setNewVehicleType(''); 
      await loadData();
      alert("Kenderaan berjaya ditambah");
    } catch (e) {
      alert("Gagal menambah kenderaan.");
    }
  };

  const handleAddDriver = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert("Sila isi semua maklumat pengguna.");
      return;
    }
    try {
      await addUser({
        id: '', // Generated by DB
        name: newUser.name,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role
      });
      setNewUser({ name: '', username: '', password: '', role: UserRole.DRIVER });
      await loadData();
      alert("Pengguna berjaya ditambah");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === user.id) {
        alert("Anda tidak boleh memadam akaun anda sendiri.");
        return;
    }

    if(window.confirm("Adakah anda pasti mahu memadam pengguna ini?")) {
      try {
        await deleteUser(id);
        await loadData();
      } catch (e) {
        alert("Gagal memadam.");
      }
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if(window.confirm("Adakah anda pasti mahu memadam kenderaan ini?")) {
      try {
        await deleteVehicle(id);
        await loadData();
      } catch (e) {
        alert("Gagal memadam.");
      }
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    const updatedUser = { ...editingUser };
    if (editingUserPassword.trim()) {
      updatedUser.password = editingUserPassword;
    }

    try {
      await updateUser(updatedUser);
      setEditingUser(null);
      setEditingUserPassword('');
      await loadData();
      alert("Pengguna dikemaskini.");
    } catch (e) {
      alert("Gagal mengemaskini.");
    }
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle) return;
    try {
      await updateVehicle(editingVehicle);
      setEditingVehicle(null);
      await loadData();
    } catch (e) {
      alert("Gagal mengemaskini.");
    }
  };

  return (
    <div className="h-screen w-full bg-amber-50 flex text-gray-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-amber-100 hidden md:flex flex-col h-full z-10 shrink-0">
        <div className="p-6">
           <h1 className="text-2xl font-bold text-primary-600 flex items-center gap-2">
             <Truck className="w-8 h-8" />
             KeDriver
           </h1>
           <p className="text-xs text-gray-500 mt-1 pl-10">Panel Ketua Pemandu</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Laporan & Log
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'settings' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-5 h-5" /> Pengurusan
          </button>
        </nav>

        <div className="p-4 border-t border-amber-100 shrink-0">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
               {user.name.charAt(0)}
             </div>
             <div className="text-sm overflow-hidden">
               <p className="font-medium text-gray-900 truncate">{user.name}</p>
               <p className="text-gray-500 text-xs">Ketua Pemandu</p>
             </div>
           </div>
           <button onClick={onLogout} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
             Log Keluar
           </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 shadow-sm z-20 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold text-primary-600">KeDriver Admin</h1>
          <button onClick={onLogout} className="text-sm text-gray-600">Keluar</button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* DELETE TRIP CONFIRMATION MODAL */}
              {tripToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-gray-900">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900">Padam Perjalanan?</h3>
                      <p className="text-gray-500 mt-2 text-sm">Adakah anda pasti mahu memadam rekod perjalanan ini? Tindakan ini tidak boleh diundur.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => setTripToDelete(null)}
                        className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={confirmDeleteTrip}
                        className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-colors"
                      >
                        Padam
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TRIP EDIT MODAL */}
              {editingTrip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Edit2 className="w-5 h-5 text-primary-500" /> Kemaskini Perjalanan
                          </h3>
                          <button onClick={() => setEditingTrip(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Mula</label>
                              <input 
                                  type="datetime-local"
                                  value={editTripStartStr}
                                  onChange={e => setEditTripStartStr(e.target.value)}
                                  className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Tamat</label>
                              <input 
                                  type="datetime-local"
                                  value={editTripEndStr}
                                  onChange={e => setEditTripEndStr(e.target.value)}
                                  className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                              />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Kenderaan</label>
                              <select 
                                  value={editingTrip.vehicleId}
                                  onChange={e => {
                                      const v = vehicles.find(veh => veh.id === e.target.value);
                                      if(v) setEditingTrip({...editingTrip, vehicleId: v.id, plateNumber: v.plateNumber, vehicleModel: v.model});
                                  }}
                                  className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                              >
                                  {vehicles.map(v => (
                                      <option key={v.id} value={v.id}>{v.plateNumber}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Pemandu</label>
                              <select 
                                  value={editingTrip.driverId}
                                  onChange={e => {
                                      const u = usersList.find(usr => usr.id === e.target.value);
                                      if(u) setEditingTrip({...editingTrip, driverId: u.id, driverName: u.name});
                                  }}
                                  className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                              >
                                  {usersList.filter(u => u.role === UserRole.DRIVER || u.role === UserRole.HEAD_DRIVER).map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                              </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Lokasi Asal</label>
                          <input 
                            type="text" 
                            value={editingTrip.origin} 
                            onChange={e => setEditingTrip({...editingTrip, origin: e.target.value})}
                            className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500"/> Destinasi</label>
                          <input 
                            type="text" 
                            value={editingTrip.destination} 
                            onChange={e => setEditingTrip({...editingTrip, destination: e.target.value})}
                            placeholder="Kosongkan jika masih aktif"
                            className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Penumpang</label>
                          <textarea 
                            value={editingTrip.passengers} 
                            onChange={e => setEditingTrip({...editingTrip, passengers: e.target.value})}
                            className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Catatan</label>
                          <textarea 
                            value={editingTrip.remarks || ''} 
                            onChange={e => setEditingTrip({...editingTrip, remarks: e.target.value})}
                            className="w-full border p-2 rounded-lg bg-gray-50 text-gray-900 text-sm"
                            rows={2}
                            placeholder="Contoh: Isian minyak..."
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <button onClick={() => setEditingTrip(null)} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold hover:bg-gray-200 transition-colors">Batal</button>
                          <button onClick={handleUpdateTrip} className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                              <Save className="w-4 h-4"/> Simpan
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">Laporan Perjalanan</h2>
                  <button onClick={loadData} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={handleExportPDF} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors">
                    <Download className="w-4 h-4" /> Eksport PDF
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex flex-col gap-4">
                <div className="flex flex-col xl:flex-row gap-4">
                  
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Cari plat, catatan atau lokasi..." 
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Driver Filter */}
                  <div className="relative min-w-[220px]">
                    <Filter className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <select 
                      value={selectedDriverFilter}
                      onChange={(e) => setSelectedDriverFilter(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 appearance-none"
                    >
                      <option value="all">Semua Pemandu</option>
                      {usersList
                        .filter(u => u.role === UserRole.DRIVER || u.role === UserRole.HEAD_DRIVER)
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <ArrowDown className="absolute right-3 top-3 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Date Filter Buttons */}
                  <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    <button 
                      onClick={() => setDateFilter('all')}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Semua
                    </button>
                    <button 
                      onClick={() => setDateFilter('week')}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateFilter === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Minggu Ini
                    </button>
                    <button 
                      onClick={() => setDateFilter('today')}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateFilter === 'today' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Hari Ini
                    </button>
                    <button 
                      onClick={() => setDateFilter('custom')}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateFilter === 'custom' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Julat Tarikh
                    </button>
                  </div>
                </div>

                {/* Custom Date Range Picker */}
                {dateFilter === 'custom' && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium">Dari:</span>
                      <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm bg-white text-gray-900"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-sm text-gray-600 font-medium">Hingga:</span>
                      <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm bg-white text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-amber-50/50 border-b border-amber-100">
                      <tr>
                        <th 
                          className="px-6 py-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-amber-100/50 transition-colors group select-none whitespace-nowrap"
                          onClick={toggleSort}
                        >
                          <div className="flex items-center gap-1">
                            Mula
                            {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-500" /> : <ArrowDown className="w-3 h-3 text-primary-500" />}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Tamat</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Pemandu</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Kenderaan</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Perjalanan</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Catatan</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTrips.map(trip => (
                        <tr key={trip.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{format(trip.startTime, 'dd/MM/yyyy')}</div>
                            <div className="text-gray-400 text-xs">{format(trip.startTime, 'hh:mm a')}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {trip.endTime ? (
                              <>
                                <div className="font-medium text-gray-900">{format(trip.endTime, 'dd/MM/yyyy')}</div>
                                <div className="text-gray-400 text-xs">{format(trip.endTime, 'hh:mm a')}</div>
                              </>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                                {trip.driverName.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{trip.driverName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{trip.plateNumber}</p>
                            <p className="text-xs text-gray-500">{trip.vehicleModel}</p>
                          </td>
                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div> {trip.origin}</span>
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${trip.destination ? 'bg-red-500' : 'bg-gray-300'} shrink-0`}></div> 
                                {trip.destination || <span className="text-primary-500 italic">Dalam perjalanan...</span>}
                              </span>
                            </div>
                            {trip.passengers && <p className="text-xs text-gray-500 mt-1 italic pl-2.5">Pax: {trip.passengers}</p>}
                          </td>
                          <td className="px-6 py-4 min-w-[150px]">
                            {trip.remarks ? (
                              <p className="text-xs text-gray-600 bg-amber-50 p-2 rounded border border-amber-100">{trip.remarks}</p>
                            ) : (
                              <span className="text-gray-300 text-xs italic">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                              {trip.status === 'ACTIVE' ? (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse whitespace-nowrap">
                                  AKTIF
                                </span>
                              ) : (
                                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                                  {formatDuration(trip.durationMinutes)}
                                </span>
                              )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => openEditTrip(trip)} 
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Sunting Perjalanan"
                              >
                                  <Edit2 className="w-4 h-4"/>
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent any row click events
                                    setTripToDelete(trip.id);
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                title="Padam Perjalanan"
                              >
                                  <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTrips.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                            {loading ? 'Memuatkan data...' : 'Tiada rekod perjalanan dijumpai.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              
              {/* EDIT USER MODAL */}
              {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">Kemaskini Pengguna</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Nama Penuh</label>
                          <input 
                            type="text" 
                            value={editingUser.name} 
                            onChange={e => setEditingUser({...editingUser,name: e.target.value})}
                            className="w-full border p-2 rounded-lg bg-white text-gray-900"
                          />
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Tukar Kata Laluan (Biarkan kosong jika tiada perubahan)</label>
                          <input 
                            type="password" 
                            value={editingUserPassword} 
                            onChange={e => setEditingUserPassword(e.target.value)}
                            placeholder="Kata Laluan Baru"
                            className="w-full border p-2 rounded-lg bg-white text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500">Peranan</label>
                          <select 
                            value={editingUser.role} 
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                            className="w-full border p-2 rounded-lg bg-white text-gray-900"
                          >
                            <option value={UserRole.DRIVER}>Pemandu</option>
                            <option value={UserRole.HEAD_DRIVER}>Ketua Pemandu</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => {setEditingUser(null); setEditingUserPassword('')}} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold">Batal</button>
                          <button onClick={handleUpdateUser} className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-bold">Simpan</button>
                        </div>
                      </div>
                  </div>
                </div>
              )}

              {/* EDIT VEHICLE MODAL */}
              {editingVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">Kemaskini Kenderaan</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Nombor Plat</label>
                          <input 
                            type="text" 
                            value={editingVehicle.plateNumber} 
                            onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value})}
                            className="w-full border p-2 rounded-lg uppercase bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Jenis</label>
                          <input 
                            type="text" 
                            value={editingVehicle.model} 
                            onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                            className="w-full border p-2 rounded-lg bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Jenis (Contoh: Lori, MPV, Van)</label>
                          <input 
                              type="text"
                              value={editingVehicle.type} 
                              onChange={e => setEditingVehicle({...editingVehicle, type: e.target.value})}
                              className="w-full border p-2 rounded-lg bg-white text-gray-900"
                              placeholder="Jenis Kenderaan"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setEditingVehicle(null)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold">Batal</button>
                          <button onClick={handleUpdateVehicle} className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-bold">Simpan</button>
                        </div>
                      </div>
                  </div>
                </div>
              )}

              {/* Manage Users Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 flex flex-col h-[650px]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Pengurusan Pemandu</h3>
                  </div>
                  
                  {/* Add User */}
                  <div className="space-y-3 pb-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-sm" 
                        placeholder="Nama Penuh"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-sm" 
                        placeholder="ID Pengguna"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      />
                    </div>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-sm" 
                      placeholder="Kata Laluan"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    />
                    <button 
                      onClick={handleAddDriver}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                    >
                      {loading ? '...' : <><Plus className="w-4 h-4" /> Tambah Pengguna</>}
                    </button>
                  </div>

                  {/* List Users */}
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Senarai Pengguna ({usersList.length})</h4>
                    <div className="space-y-2">
                      {usersList.map(u => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors gap-3">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${u.role === UserRole.HEAD_DRIVER ? 'bg-gray-800' : 'bg-blue-500'}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-gray-800 truncate">{u.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>@{u.username}</span> • {u.role === UserRole.HEAD_DRIVER ? 'Admin' : 'Pemandu'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingUser(u)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteUser(u.id);
                              }} 
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Padam Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>

              {/* Manage Vehicles Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 flex flex-col h-[650px]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                      <Truck className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Pengurusan Kenderaan</h3>
                  </div>
                  
                  {/* Add Vehicle */}
                  <div className="space-y-3 pb-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase bg-white text-gray-900" 
                        placeholder="Plat"
                        value={newVehiclePlate}
                        onChange={(e) => setNewVehiclePlate(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-gray-900" 
                        placeholder="Jenis"
                        value={newVehicleModel}
                        onChange={(e) => setNewVehicleModel(e.target.value)}
                      />
                    </div>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-gray-900 text-sm"
                      placeholder="Jenama"
                      value={newVehicleType}
                      onChange={(e) => setNewVehicleType(e.target.value)}
                    />
                    <button 
                      onClick={handleAddVehicle}
                      disabled={loading}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                    >
                      {loading ? '...' : <><Plus className="w-4 h-4" /> Tambah Kenderaan</>}
                    </button>
                  </div>

                  {/* List Vehicles */}
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Senarai Kenderaan ({vehicles.length})</h4>
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-800">{v.plateNumber}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                {v.model} <span className="bg-primary-100 text-primary-800 px-1.5 rounded text-[10px] font-bold">{v.type}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingVehicle(v)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteVehicle(v.id);
                                }} 
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                title="Padam Kenderaan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminView;
