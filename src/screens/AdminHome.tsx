import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { Button, Card, Badge, Checkbox, Input as CustomInput, DateInput, Plate } from '../components/ui';
import {
  LogOut, ChevronDown, ChevronLeft, ChevronRight, Users as UsersIcon, MapPin, Calendar, Clock,
  Plus, X, Trash2, CheckCircle2, Download, Search, Settings,
  Truck, ArrowUp, ArrowDown, Edit2, FileText, UserPlus, Car
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTo12Hour, formatToDDMMYYYY, getDayOfWeek, formatToDateTime, getGroupHeader, getTodayStrGMT8 } from '../lib/dateUtils';
import { User, Vehicle, Trip, UserRole } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Support for autoTable in jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type AdminTab = 'RIDES' | 'LOGS' | 'JADUAL' | 'SYSTEM';
type SortKey = 'startTime' | 'endTime' | 'driverName' | 'plateNumber' | 'origin' | 'status' | 'remarks';

export function AdminHome() {
  const {
    currentUser, logout, requests, rides, trips, users, vehicles,
    scheduleRide, rejectRequests, completeRide, deleteRide,
    addUser, updateUser, deleteUser,
    addVehicle, updateVehicle, deleteVehicle,
    deleteTrip, updateTrip, deleteRequest, cleanupOldData
  } = useAppStore();

  useEffect(() => {
    cleanupOldData();
  }, []);

  const [activeTab, setActiveTab] = useState<AdminTab>('RIDES');
  const [rideTab, setRideTab] = useState<'PENDING' | 'SCHEDULED'>('PENDING');

  // LOGS STATE
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortKey, setSortKey] = useState<SortKey>('startTime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPageInput, setLogPageInput] = useState('1');
  const itemsPerPage = 10;

  useEffect(() => {
    setLogPage(1);
    setLogPageInput('1');
  }, [dateFilter, selectedDriverFilter, logSearchQuery]);

  useEffect(() => {
    setLogPageInput(logPage.toString());
  }, [logPage]);

  // SORTING & FILTERING LOGS
  const filteredTrips = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = today - (7 * 24 * 60 * 60 * 1000);

    let filtered = trips.filter(trip => {
      if (selectedDriverFilter !== 'all' && trip.driverId !== selectedDriverFilter) return false;

      let passDate = true;
      if (dateFilter === 'today') passDate = trip.startTime >= today;
      else if (dateFilter === 'week') passDate = trip.startTime >= oneWeekAgo;
      else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate).setHours(0, 0, 0, 0);
        const end = new Date(customEndDate).setHours(23, 59, 59, 999);
        passDate = trip.startTime >= start && trip.startTime <= end;
      }

      const query = logSearchQuery.toLowerCase();
      const passSearch =
        trip.driverName.toLowerCase().includes(query) ||
        trip.plateNumber.toLowerCase().includes(query) ||
        (trip.destination && trip.destination.toLowerCase().includes(query)) ||
        (trip.remarks && trip.remarks.toLowerCase().includes(query)) ||
        trip.origin.toLowerCase().includes(query);

      return passDate && passSearch;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'startTime': comparison = a.startTime - b.startTime; break;
        case 'endTime': comparison = (a.endTime || 0) - (b.endTime || 0); break;
        case 'driverName':
          comparison = a.driverName.localeCompare(b.driverName);
          if (comparison === 0) return b.startTime - a.startTime;
          break;
        case 'plateNumber': comparison = a.plateNumber.localeCompare(b.plateNumber); break;
        case 'origin': comparison = a.origin.localeCompare(b.origin); break;
        case 'status': comparison = a.status.localeCompare(b.status); break;
        case 'remarks': comparison = (a.remarks || '').localeCompare(b.remarks || ''); break;
        default: comparison = b.startTime - a.startTime;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [trips, dateFilter, selectedDriverFilter, logSearchQuery, sortKey, sortOrder, customStartDate, customEndDate]);

  const paginatedTrips = useMemo(() => {
    const start = (logPage - 1) * itemsPerPage;
    return filteredTrips.slice(start, start + itemsPerPage);
  }, [filteredTrips, logPage]);

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);

  // SYSTEM MANAGEMENT STATE
  const [sysTab, setSysTab] = useState<'USERS' | 'VEHICLES'>('USERS');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // USER MANAGEMENT STATE (FILTERING)
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // VEHICLE MANAGEMENT STATE (FILTERING)
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('ALL');

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const matchesType = vehicleTypeFilter === 'ALL' || v.type === vehicleTypeFilter;
        const matchesSearch = v.plateNumber.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
          v.model.toLowerCase().includes(vehicleSearchQuery.toLowerCase());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
  }, [vehicles, vehicleTypeFilter, vehicleSearchQuery]);

  const vehicleTypes = useMemo(() => Array.from(new Set(vehicles.map(v => v.type))).sort(), [vehicles]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
        const matchesSearch = u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase()));
        return matchesRole && matchesSearch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, userRoleFilter, userSearchQuery]);

  // RIDE PENDING SELECTION
  const pendingRequests = useMemo(() =>
    requests.filter(r => r.status === 'PENDING').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [requests]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingRide, setEditingRide] = useState<any>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editTripStartStr, setEditTripStartStr] = useState('');
  const [editTripEndStr, setEditTripEndStr] = useState('');
  
  // JADUAL (TIMETABLE) STATE
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timetableSearch, setTimetableSearch] = useState('');


  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.setTextColor(234, 88, 12); // #ea580c
    doc.text("KeDriver - Laporan Perjalanan", 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Dijana oleh: ${currentUser?.name || currentUser?.username}`, 14, 28);
    doc.text(`Tarikh: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 34);

    const tableData = filteredTrips.map(t => {
      const formattedEndTime = t.endTime ? `${format(t.endTime, 'dd/MM/yyyy')}\n${format(t.endTime, 'hh:mm a')}` : '-';
      const duration = t.durationMinutes ? `${Math.floor(t.durationMinutes / 60)}j ${t.durationMinutes % 60}m` : 'Aktif';
      return [
        `${format(t.startTime, 'dd/MM/yyyy')}\n${format(t.startTime, 'hh:mm a')}`,
        formattedEndTime,
        t.driverName,
        t.plateNumber,
        t.vehicleBrand || '-',
        t.origin + (t.destination ? ` > ${t.destination}` : ' > [Aktif]'),
        t.passengers || '-',
        t.remarks || '-',
        duration
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Mula', 'Tamat', 'Pemandu', 'Plat', 'Jenama', 'Lokasi', 'Penumpang', 'Catatan', 'Tempoh']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        7: { cellWidth: 50 },
      },
    });

    doc.save(`Laporan_KeDriver_Paparan_${Date.now()}.pdf`);
  };

  const handleExportByDriver = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const drivers = users.filter(u => u.role === 'DRIVER')
      .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username));

    drivers.forEach((driver, index) => {
      if (index > 0) doc.addPage();

      // Header
      doc.setFontSize(14);
      doc.setTextColor(245, 158, 11); // Amber 500 from reference
      doc.setFont("helvetica", "bold");
      doc.text(driver.name || driver.username, 14, 20);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Dijana oleh: ${currentUser?.name || currentUser?.username}`, 14, 28);
      doc.text(`Tarikh: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 34);

      // Use driverId for exact match
      const driverTrips = filteredTrips.filter(t => t.driverId === driver.id);

      if (driverTrips.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.text("Tiada Rekod Perjalanan Ditemui", 14, 45);
      } else {
        const tableData = driverTrips.map(t => {
          const formattedEndTime = t.endTime ? `${format(t.endTime, 'dd/MM/yyyy')}\n${format(t.endTime, 'hh:mm a')}` : '-';
          const duration = t.durationMinutes ? (t.durationMinutes >= 60 ? `${Math.floor(t.durationMinutes / 60)}h ${t.durationMinutes % 60}m` : `${t.durationMinutes}m`) : 'Aktif';

          return [
            `${format(t.startTime, 'dd/MM/yyyy')}\n${format(t.startTime, 'hh:mm a')}`,
            formattedEndTime,
            t.plateNumber,
            t.vehicleBrand || '-',
            t.vehicleModel || '-',
            t.origin + (t.destination ? ` > ${t.destination}` : ' > [Aktif]'),
            t.passengers || '-',
            t.remarks || '-',
            duration
          ];
        });

        autoTable(doc, {
          startY: 40,
          head: [['Mula', 'Tamat', 'Plat', 'Jenama', 'Model', 'Lokasi', 'Penumpang', 'Catatan', 'Tempoh']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // Amber 500
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 35 },
            6: { cellWidth: 20 },
            7: { cellWidth: 50 },
            8: { cellWidth: 15 },
          }
        });
      }
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
    doc.save(`Laporan_Pemandu_${timestamp}.pdf`);
  };

  const formatForInput = (timestamp: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setEditTripStartStr(formatForInput(trip.startTime));
    setEditTripEndStr(trip.endTime ? formatForInput(trip.endTime) : '');
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleDate = (date: string, select: boolean) => {
    const idsInDate = pendingRequests.filter(r => r.date === date).map(r => r.id);
    const next = new Set(selectedIds);
    idsInDate.forEach(id => {
      if (select) next.add(id);
      else next.delete(id);
    });
    setSelectedIds(next);
  };

  return (
    <div className="flex flex-col md:flex-row bg-[#fff7ed] min-h-[100dvh] max-w-7xl mx-auto overflow-hidden text-[#431407]">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-[#ea580c]/10 hidden md:flex flex-col h-screen shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#ea580c] p-2 rounded-2xl text-white">
              <Truck size={24} />
            </div>
            <h1 className="text-2xl font-black text-[#ea580c]">KeDriver</h1>
          </div>
          <p className="text-[10px] font-bold text-[#431407]/40 uppercase tracking-widest pl-1">Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarButton active={activeTab === 'RIDES'} onClick={() => setActiveTab('RIDES')} icon={<Calendar size={20} />} label="Permohonan" />
          <SidebarButton active={activeTab === 'LOGS'} onClick={() => setActiveTab('LOGS')} icon={<FileText size={20} />} label="Log Perjalanan" />
          <SidebarButton active={activeTab === 'JADUAL'} onClick={() => setActiveTab('JADUAL')} icon={<Clock size={20} />} label="Jadual Pemandu" />
          <SidebarButton active={activeTab === 'SYSTEM'} onClick={() => setActiveTab('SYSTEM')} icon={<Settings size={20} />} label="Pengurusan Sistem" />
        </nav>

        <div className="p-6 border-t border-[#ea580c]/10">
          <div className="flex flex-col gap-1 mb-6 px-2">
            <div className="font-black text-sm text-[#431407] leading-tight">
              {currentUser?.name || currentUser?.username}
            </div>
            <div className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider">
              Admin
            </div>
          </div>
          <Button variant="tonal" className="w-full text-xs font-bold py-3" onClick={logout}>
            <LogOut size={16} /> Log Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#ea580c] text-white p-4 px-6 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Truck size={20} />
            <span className="font-black">KeDriver Admin</span>
          </div>
          <button onClick={logout} className="p-2 bg-white/20 rounded-full"><LogOut size={18} /></button>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex bg-white border-b border-[#ea580c]/10 p-1">
          <MobileTab active={activeTab === 'RIDES'} onClick={() => setActiveTab('RIDES')} label="Ride" />
          <MobileTab active={activeTab === 'LOGS'} onClick={() => setActiveTab('LOGS')} label="Logs" />
          <MobileTab active={activeTab === 'JADUAL'} onClick={() => setActiveTab('JADUAL')} label="Jadual" />
          <MobileTab active={activeTab === 'SYSTEM'} onClick={() => setActiveTab('SYSTEM')} label="System" />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'RIDES' && (
              <motion.div key="rides" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 h-full flex flex-col">
                <div className="flex justify-between items-center bg-white/50 p-1 rounded-2xl border border-[#ea580c]/10 backdrop-blur-sm self-start">
                  <button onClick={() => setRideTab('PENDING')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${rideTab === 'PENDING' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-[#ea580c]/60'}`}>
                    Permohonan ({pendingRequests.length})
                  </button>
                  <button onClick={() => setRideTab('SCHEDULED')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${rideTab === 'SCHEDULED' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-[#ea580c]/60'}`}>
                    Berjadual ({rides.filter(r => r.status !== 'COMPLETED' && r.date >= getTodayStrGMT8()).length})
                  </button>
                </div>

                {rideTab === 'PENDING' ? (
                  <div className="space-y-4">
                    {pendingRequests.length === 0 ? <EmptyState icon={<Calendar size={48} />} label="Tiada permohonan baharu" /> :
                      pendingRequests.map((req, idx) => {
                        const showHeader = idx === 0 || pendingRequests[idx - 1].date !== req.date;
                        return (
                          <React.Fragment key={req.id}>
                            {showHeader && (() => {
                              const idsInDate = pendingRequests.filter(r => r.date === req.date).map(r => r.id);
                              const allSelected = idsInDate.every(id => selectedIds.has(id));
                              return (
                                <div className="pt-6 pb-2 border-b-2 border-amber-50 mb-4 px-2 flex justify-between items-center">
                                  <span className="text-xs font-black text-[#ea580c] uppercase tracking-[0.1em] flex items-center gap-2">
                                    <Calendar size={14} /> {getGroupHeader(req.date)}
                                  </span>
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className="text-[10px] font-black uppercase text-[#431407]/40 group-hover:text-[#ea580c] transition-colors">Semua</span>
                                    <Checkbox
                                      checked={allSelected}
                                      onChange={() => toggleDate(req.date, !allSelected)}
                                    />
                                  </label>
                                </div>
                              );
                            })()}
                            <PendingCard req={req} isSelected={selectedIds.has(req.id)} onToggle={() => toggleSelect(req.id)} />
                          </React.Fragment>
                        );
                      })
                    }
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const activeRides = rides
                        .filter(r => r.status !== 'COMPLETED' && r.date >= getTodayStrGMT8())
                        .sort((a, b) => {
                          const dateA = a.date || "";
                          const dateB = b.date || "";
                          const dateDiff = dateA.localeCompare(dateB);
                          if (dateDiff !== 0) return dateDiff;
                          const timeA = a.time || "";
                          const timeB = b.time || "";
                          return timeA.localeCompare(timeB);
                        });

                      return activeRides.length === 0 ? (
                        <EmptyState icon={<Clock size={48} />} label="Tiada perjalanan berjadual" />
                      ) : (
                        activeRides.map(ride => (
                          <RideCard key={ride.id} ride={ride} requests={requests} />
                        ))
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'JADUAL' && (
              <motion.div key="jadual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 pb-20">
                {!selectedDriverId ? (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-black">Jadual Pemandu</h2>
                        <p className="text-sm font-bold text-[#431407]/40">Pilih pemandu untuk melihat jadual bulanan</p>
                      </div>
                      <div className="w-full md:w-64 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#431407]/20 group-focus-within:text-[#ea580c]" size={18} />
                        <input
                          placeholder="Cari pemandu..."
                          value={timetableSearch}
                          onChange={e => setTimetableSearch(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-[#ea580c]/10 rounded-2xl font-bold outline-none focus:ring-1 focus:ring-[#ea580c] shadow-sm text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users
                        .filter(u => u.role === 'DRIVER' && (
                          (u.name || '').toLowerCase().includes(timetableSearch.toLowerCase()) ||
                          u.username.toLowerCase().includes(timetableSearch.toLowerCase())
                        ))
                        .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username))
                        .map(driver => (
                          <Card 
                            key={driver.id} 
                            onClick={() => setSelectedDriverId(driver.id)}
                            className="!p-5 border border-[#ea580c]/5 hover:border-[#ea580c]/20 hover:shadow-md transition-all cursor-pointer group bg-white"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-[#ea580c]/5 flex items-center justify-center text-[#ea580c] group-hover:bg-[#ea580c] group-hover:text-white transition-all">
                                <UsersIcon size={24} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-black text-base">{driver.name || driver.username}</div>
                                <div className="text-[10px] font-bold text-[#431407]/30 uppercase tracking-wider">@{driver.username}</div>
                              </div>
                              <ChevronRight size={18} className="text-[#ea580c]/20 group-hover:text-[#ea580c] transition-colors" />
                            </div>
                          </Card>
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-start gap-5">
                      <button 
                        onClick={() => setSelectedDriverId(null)}
                        className="mt-1 p-4 bg-white border border-[#ea580c]/5 rounded-[20px] text-[#ea580c] hover:bg-[#ea580c]/5 transition-all shadow-sm"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <div className="flex-1">
                        <h2 className="text-3xl font-black text-[#431407] leading-tight max-w-[300px]">
                          {users.find(u => u.id === selectedDriverId)?.name || users.find(u => u.id === selectedDriverId)?.username}
                        </h2>
                        <p className="text-[11px] font-black text-[#431407]/30 uppercase tracking-[0.2em] mt-2">Jadual Perjalanan Bulanan</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[40px] shadow-sm border border-[#ea580c]/10 overflow-hidden">
                      <MonthlyTimetable 
                        driverId={selectedDriverId} 
                        trips={trips} 
                        currentMonth={currentMonth} 
                        onMonthChange={setCurrentMonth} 
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'LOGS' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-2xl font-black">Log Perjalanan</h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleExportByDriver} className="bg-white border border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/5 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-sm">
                      <Download size={16} /> Eksport Mengikut Pemandu
                    </button>
                    <Button onClick={handleExportPDF} className="bg-[#10b981] shadow-[#10b981]/20">
                      <Download size={18} /> Eksport Semua
                    </Button>
                  </div>
                </div>

                <Card className="!p-5 bg-white border border-[#ea580c]/10">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#431407]/20 group-focus-within:text-[#ea580c] transition-colors" size={20} />
                        <input
                          placeholder="Cari pemandu, plat, lokasi..."
                          value={logSearchQuery} onChange={e => setLogSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-[#fffaf5] border border-transparent rounded-[20px] font-bold outline-none ring-[#ea580c] focus:ring-1 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value as any)}
                        className="bg-[#fffaf5] border border-[#ea580c]/10 rounded-2xl px-4 py-3 outline-none font-bold text-sm focus:ring-1 focus:ring-[#ea580c]"
                      >
                        <option value="all">Semua Tarikh</option>
                        <option value="today">Hari Ini</option>
                        <option value="week">Minggu Ini</option>
                        <option value="custom">Julat Tarikh (Custom)...</option>
                      </select>
                      <select
                        value={selectedDriverFilter}
                        onChange={e => setSelectedDriverFilter(e.target.value)}
                        className="bg-[#fffaf5] border border-[#ea580c]/10 rounded-2xl px-4 py-3 outline-none font-bold text-sm focus:ring-1 focus:ring-[#ea580c]"
                      >
                        <option value="all">Semua Pemandu</option>
                        {users
                          .filter(u => u.role === 'DRIVER')
                          .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username))
                          .map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                      </select>
                    </div>
                  </div>

                  <AnimatePresence>
                    {dateFilter === 'custom' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-4 mt-4 border-t border-[#ea580c]/5 flex flex-col md:flex-row gap-4">
                          <div className="flex-1"><DateInput label="Dari" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} /></div>
                          <div className="flex-1"><DateInput label="Hingga" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} /></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                {/* Pagination & Stats Panel (Top) */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-[28px] border border-[#ea580c]/10 backdrop-blur-sm shadow-sm">
                  <div className="text-[11px] font-black uppercase text-[#ea580c]/40 tracking-wider">
                    Paparan <span className="text-[#ea580c]">{Math.min(filteredTrips.length, (logPage - 1) * itemsPerPage + 1)}-{Math.min(filteredTrips.length, logPage * itemsPerPage)}</span> daripada <span className="text-[#ea580c]">{filteredTrips.length}</span> log
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={logPage === 1}
                        onClick={() => setLogPage(p => p - 1)}
                        className="p-2 rounded-xl border border-[#ea580c]/10 text-[#ea580c] disabled:opacity-20 hover:bg-[#ea580c]/5 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="flex gap-2 items-center px-4 border-x border-[#ea580c]/10">
                        <div className="flex items-center gap-1 bg-[#ea580c]/5 px-2 py-1 rounded-lg border border-[#ea580c]/20">
                          <span className="text-[10px] font-black uppercase text-[#ea580c]/40">Halaman</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={logPageInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d+$/.test(val)) {
                                setLogPageInput(val);
                                const num = parseInt(val);
                                if (!isNaN(num) && num >= 1 && num <= totalPages) {
                                  setLogPage(num);
                                }
                              }
                            }}
                            onBlur={() => {
                              if (logPageInput === '' || parseInt(logPageInput) < 1) {
                                setLogPageInput(logPage.toString());
                              } else if (parseInt(logPageInput) > totalPages) {
                                setLogPageInput(totalPages.toString());
                                setLogPage(totalPages);
                              }
                            }}
                            className="w-10 bg-transparent text-sm font-black text-[#ea580c] outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#ea580c]/30 whitespace-nowrap">daripada {totalPages}</span>
                      </div>
                      <button
                        disabled={logPage >= totalPages}
                        onClick={() => setLogPage(p => p + 1)}
                        className="p-2 rounded-xl border border-[#ea580c]/10 text-[#ea580c] disabled:opacity-20 hover:bg-[#ea580c]/5 transition-all cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[32px] overflow-hidden border border-[#ea580c]/10 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#fffaf5] border-b border-[#ea580c]/10">
                        <LogHeader label="Mula" sortKey="startTime" currentKey={sortKey} order={sortOrder} onClick={setSortKey} onOrder={setSortOrder} />
                        <LogHeader label="Tamat" sortKey="endTime" currentKey={sortKey} order={sortOrder} onClick={setSortKey} onOrder={setSortOrder} />
                        <LogHeader label="Pemandu" sortKey="driverName" currentKey={sortKey} order={sortOrder} onClick={setSortKey} onOrder={setSortOrder} />
                        <LogHeader label="Kenderaan" sortKey="plateNumber" currentKey={sortKey} order={sortOrder} onClick={setSortKey} onOrder={setSortOrder} />
                        <th className="p-4 text-[11px] font-black uppercase text-[#ea580c]/60">Lokasi / Destinasi</th>
                        <th className="p-4 text-[11px] font-black uppercase text-[#ea580c]/60">Penumpang</th>
                        <th className="p-4 text-[11px] font-black uppercase text-[#ea580c]/60">Catatan</th>
                        <th className="p-4 text-[11px] font-black uppercase text-[#ea580c]/60">Status</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.map(trip => (
                        <tr key={trip.id} className="border-b border-[#ea580c]/5 hover:bg-[#fffaf5]/50 transition-colors">
                          <td className="p-4 text-xs font-bold leading-tight">
                            <div>{format(trip.startTime, 'dd/MM/yyyy')}</div>
                            <div className="text-[10px] font-black uppercase tracking-tighter opacity-30 mt-0.5">{format(trip.startTime, 'hh:mm a')}</div>
                          </td>
                          <td className="p-4 text-xs font-bold leading-tight">
                            {trip.endTime ? (
                              <>
                                <div>{format(trip.endTime, 'dd/MM/yyyy')}</div>
                                <div className="text-[10px] font-black uppercase tracking-tighter opacity-30 mt-0.5">{format(trip.endTime, 'hh:mm a')}</div>
                              </>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-sm font-black min-w-[240px]">{trip.driverName}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 min-w-[100px]">
                              <Plate number={trip.plateNumber} />
                              {(trip.vehicleBrand || trip.vehicleModel) && (
                                <div className="text-[10px] font-black uppercase text-[#431407]/30 tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                                  {trip.vehicleBrand} {trip.vehicleModel}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium">
                            <span className="opacity-60">{trip.origin}</span>
                            {trip.destination && <span className="mx-2 text-[#ea580c]">→</span>}
                            {trip.destination}
                          </td>
                          <td className="p-4 text-[11px] font-bold text-[#431407]/60 min-w-[120px]">{trip.passengers}</td>
                          <td className="p-4 text-[11px] font-medium text-[#431407]/50 min-w-[200px] whitespace-pre-wrap">{trip.remarks || '-'}</td>
                          <td className="p-4">
                            <Badge status={trip.status}>{trip.status}</Badge>
                            <div className="text-[10px] font-black text-[#431407]/40 mt-1">
                              {trip.durationMinutes ? (
                                trip.durationMinutes >= 60 
                                  ? `${Math.floor(trip.durationMinutes / 60)}j ${trip.durationMinutes % 60}m`
                                  : `${trip.durationMinutes}m`
                              ) : '-'}
                            </div>
                          </td>
                          <td className="p-4 flex gap-1">
                            <button onClick={() => openEditTrip(trip)} className="p-2 text-[#ea580c] hover:bg-[#ea580c]/5 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => { if (window.confirm('Padam trip ini?')) deleteTrip(trip.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </motion.div>
            )}

            {activeTab === 'SYSTEM' && (
              <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex bg-white/50 p-1 rounded-2xl border border-[#ea580c]/10 backdrop-blur-sm self-start">
                  <button onClick={() => setSysTab('USERS')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${sysTab === 'USERS' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-[#ea580c]/60'}`}>
                    Pengurusan Pengguna
                  </button>
                  <button onClick={() => setSysTab('VEHICLES')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${sysTab === 'VEHICLES' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-[#ea580c]/60'}`}>
                    Pengurusan Kenderaan
                  </button>
                </div>

                {sysTab === 'USERS' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">Senarai Pengguna</h3>
                      <Button onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                        <UserPlus size={18} /> Tambah Pengguna
                      </Button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#431407]/20 group-focus-within:text-[#ea580c] transition-colors" size={20} />
                        <input
                          placeholder="Cari ID atau Nama Pengguna..."
                          value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#ea580c]/10 rounded-[24px] font-bold outline-none ring-[#ea580c] focus:ring-1 transition-all shadow-sm"
                        />
                      </div>
                      <div className="flex bg-[#fffaf5] p-1 rounded-[24px] border border-[#ea580c]/10 self-start md:self-stretch overflow-x-auto no-scrollbar">
                        {['ALL', 'ADMIN', 'DRIVER', 'REQUESTER'].map((role) => (
                          <button
                            key={role}
                            onClick={() => setUserRoleFilter(role as any)}
                            className={`px-4 py-1.5 rounded-[20px] text-[11px] font-black uppercase transition-all whitespace-nowrap ${userRoleFilter === role ? 'bg-[#ea580c] text-white shadow-md' : 'text-[#ea580c]/40 hover:bg-[#ea580c]/5'}`}
                          >
                            {role === 'ALL' ? 'Semua' : role === 'REQUESTER' ? 'Pegawai' : role === 'DRIVER' ? 'Pemandu' : 'Admin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-[#ea580c]/30 font-bold uppercase tracking-widest text-xs">Tiada pengguna ditemui</div>
                      ) : filteredUsers.map(u => (
                        <Card key={u.id} className="!p-4 border border-[#ea580c]/5 hover:border-[#ea580c]/20 transition-all flex items-center justify-between group">
                          <div className="flex flex-col">
                            <div className="font-black text-base text-[#431407] group-hover:text-[#ea580c] transition-colors">
                              {u.name || (u.role === 'ADMIN' ? 'System Admin' : 'Pengguna')}
                            </div>
                            <div className="text-xs font-bold text-[#431407]/40 tracking-tight">@{u.username}</div>
                          </div>

                          <div className="flex items-center gap-6">
                            <Badge status={u.role}>{u.role}</Badge>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2 text-[#ea580c] hover:bg-[#ea580c]/10 rounded-xl transition-all"><Edit2 size={18} /></button>
                              <button onClick={() => { if (window.confirm('Padam pengguna?')) deleteUser(u.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <h3 className="text-xl font-bold">Senarai Kenderaan</h3>
                      <Button onClick={() => { setEditingVehicle(null); setShowVehicleModal(true); }}>
                        <Plus size={18} /> Tambah Kenderaan
                      </Button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#431407]/20 group-focus-within:text-[#ea580c] transition-colors" size={18} />
                        <input
                          placeholder="Cari No Plat atau Model..."
                          value={vehicleSearchQuery} onChange={e => setVehicleSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-[#ea580c]/10 rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1 transition-all shadow-sm text-sm"
                        />
                      </div>
                      <select
                        value={vehicleTypeFilter}
                        onChange={e => setVehicleTypeFilter(e.target.value)}
                        className="bg-white border border-[#ea580c]/10 rounded-2xl px-4 py-3 outline-none font-bold text-xs focus:ring-1 focus:ring-[#ea580c] shadow-sm uppercase tracking-wider"
                      >
                        <option value="ALL">Semua Jenama</option>
                        {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredVehicles.length === 0 ? (
                        <div className="col-span-full p-12 text-center text-[#ea580c]/30 font-bold uppercase tracking-widest text-xs italic">Tiada kenderaan djumpai</div>
                      ) : filteredVehicles.map(v => (
                        <Card key={v.id} className="!p-4 border border-[#ea580c]/5 hover:border-[#ea580c]/20 transition-all group relative overflow-hidden bg-white hover:shadow-md">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <Plate number={v.plateNumber} className="text-sm py-1 px-3 mb-2" />
                              <div className="text-[11px] font-black text-[#431407] uppercase truncate max-w-[150px]">{v.model}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] font-black uppercase text-[#ea580c] bg-[#ea580c]/5 px-2 py-0.5 rounded-md border border-[#ea580c]/10">{v.type}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => { setEditingVehicle(v); setShowVehicleModal(true); }} className="p-2 text-[#ea580c] hover:bg-[#ea580c]/5 rounded-xl transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => { if (window.confirm('Padam kenderaan?')) deleteVehicle(v.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* FOOTER ACTION BAR FOR PENDING RIDES */}
      <AnimatePresence>
        {selectedIds.size > 0 && activeTab === 'RIDES' && rideTab === 'PENDING' && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto p-4 z-50">
            <div className="bg-[#431407] text-white rounded-[32px] p-2 pr-4 pl-6 flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(67,20,7,0.5)] border border-white/10">
              <span className="font-bold text-[14px]">{selectedIds.size} Dipilih</span>
              <div className="flex gap-2">
                <button onClick={() => { if (window.confirm('Tolak permohonan yang dipilih?')) rejectRequests(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="px-4 py-2 text-[13px] font-semibold text-[#ef4444] hover:bg-white/10 rounded-full transition-colors">
                  Tolak
                </button>
                <button onClick={() => { setEditingRide(null); setShowScheduleModal(true); }} className="px-[24px] py-[12px] text-[13px] font-bold bg-[#ea580c] text-white rounded-[100px] shadow-sm hover:bg-[#c2410c] transition-colors">
                  Jadualkan Perjalanan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      {showScheduleModal && (
        <ScheduleModal
          selectedIds={editingRide ? editingRide.requestIds : Array.from(selectedIds)}
          rideToEdit={editingRide}
          onClose={() => { setShowScheduleModal(false); setEditingRide(null); }}
          onSuccess={() => { setShowScheduleModal(false); setSelectedIds(new Set()); setEditingRide(null); }}
        />
      )}
      {editingTrip && <EditTripModal trip={editingTrip} startStr={editTripStartStr} setStartStr={setEditTripStartStr} endStr={editTripEndStr} setEndStr={setEditTripEndStr} onClose={() => setEditingTrip(null)} />}
      {showUserModal && <UserDialog user={editingUser} onClose={() => setShowUserModal(false)} />}
      {showVehicleModal && <VehicleDialog vehicle={editingVehicle} onClose={() => setShowVehicleModal(false)} />}
    </div>
  );
}

// HELPER COMPONENTS
function SidebarButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${active ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/20' : 'text-[#431407]/60 hover:bg-[#ffedd5] hover:text-[#ea580c]'}`}
    >
      {icon} {label}
    </button>
  );
}

function MobileTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${active ? 'border-[#ea580c] text-[#ea580c]' : 'border-transparent text-[#431407]/40'}`}>
      {label}
    </button>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-4">
      {icon}
      <p className="font-black uppercase tracking-widest text-sm">{label}</p>
    </div>
  );
}

function LogHeader({ label, sortKey, currentKey, order, onClick, onOrder }: { label: string, sortKey: SortKey, currentKey: SortKey, order: 'asc' | 'desc', onClick: (k: SortKey) => void, onOrder: (o: 'asc' | 'desc') => void }) {
  const isActive = currentKey === sortKey;
  return (
    <th className="p-4 cursor-pointer group" onClick={() => {
      if (isActive) onOrder(order === 'asc' ? 'desc' : 'asc');
      else { onClick(sortKey); onOrder('desc'); }
    }}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#ea580c]/60 group-hover:text-[#ea580c]">
        {label}
        {isActive ? (order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowDown size={12} className="opacity-0 group-hover:opacity-30" />}
      </div>
    </th>
  );
}

function PendingCard({ req, isSelected, onToggle }: { req: any, isSelected: boolean, onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`p-4 rounded-[28px] transition-all cursor-pointer border ${isSelected ? 'bg-[#ffedd5] border-[#ea580c]' : 'bg-white border-transparent shadow-sm hover:border-[#ea580c]/20'}`}>
      <div className="flex items-start gap-4">
        <Checkbox checked={isSelected} onChange={onToggle} className="mt-1" />
        <div className="flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-black text-lg text-[#431407]">{req.requesterName || req.requesterUsername}</div>
              <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${(req.timePreference === 'Pagi' || req.timePreference === 'Day') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                  {req.timePreference}
                </div>
                <div className="text-[10px] font-bold opacity-30">•</div>
                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{formatToDDMMYYYY(req.date)}</div>
              </div>
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="text-[#ea580c] opacity-60">
              <ChevronDown size={20} />
            </motion.div>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-[#ea580c]/10">
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase text-[#ea580c]/60 mb-2">Destinasi</div>
                  {req.destinations.map((d: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-[#fffaf5] border border-[#ea580c]/5 text-[13px] font-bold">
                      <MapPin size={14} className="text-[#ea580c]" /> {d}
                    </div>
                  ))}
                  {req.note && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-2xl text-xs italic opacity-70">"{req.note}"</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function RideCard({ ride, requests }: { ride: any, requests: any }) {
  const { deleteRide, completeRide } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const rideRequesters = requests.filter((r: any) => ride.requestIds.includes(r.id));

  return (
    <Card className="border-l-4 border-l-[#ea580c] !p-5">
      <div className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start mb-3">
          <Badge status={ride.status}>{ride.status}</Badge>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="text-[#ea580c] opacity-60">
            <ChevronDown size={20} />
          </motion.div>
        </div>
        <div className="text-xl font-black">{formatToDDMMYYYY(ride.date)}</div>
        <div className="text-sm font-bold opacity-60 mt-0.5 flex flex-wrap items-center gap-x-2">
          <span>{formatTo12Hour(ride.time)}</span>
          <span className="opacity-30">•</span>
          <span>Pemandu: {ride.driverName}</span>
          {ride.plateNumber && (
            <>
              <span className="opacity-30">•</span>
              <span className="text-[#ea580c]">{ride.plateNumber} ({ride.vehicleModel})</span>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-[#ea580c]/10 space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase text-[#ea580c]/60 mb-2">Penumpang & Nota</div>
              <div className="space-y-2">
                {rideRequesters.map((req: any) => (
                  <div key={req.id} className="bg-[#fffaf5] p-3 rounded-2xl border border-[#ea580c]/5">
                    <div className="font-bold text-sm text-[#ea580c]">{req.requesterName || req.requesterUsername}</div>
                    {req.note && <div className="text-[11px] italic opacity-60">"{req.note}"</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => deleteRide(ride.id)} className="flex-1 py-3 text-xs font-bold bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">Batal Perjalanan</button>
              <button onClick={() => completeRide(ride.id)} className="flex-1 py-3 text-xs font-bold bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors">Selesai</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// DIALOGS
function ScheduleModal({ selectedIds, rideToEdit, onClose, onSuccess }: { selectedIds: string[], rideToEdit?: any, onClose: () => void, onSuccess: () => void }) {
  const { requests, scheduleRide, updateRide, users, vehicles } = useAppStore();
  const selectedReqs = requests.filter(r => selectedIds.includes(r.id));
  const drivers = users.filter(u => u.role === 'DRIVER');

  const sortedByDate = useMemo(() => [...selectedReqs].sort((a, b) => a.date.localeCompare(b.date)), [selectedReqs]);
  const [driverName, setDriverName] = useState(rideToEdit?.driverName || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState(rideToEdit?.vehicleId || '');
  const [date, setDate] = useState(rideToEdit?.date || sortedByDate[0]?.date || '');
  const [time, setTime] = useState(rideToEdit?.time || '09:00');

  // Search/Filter State
  const [searchDriver, setSearchDriver] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterModel, setFilterModel] = useState('');

  const allTypes = useMemo(() => Array.from(new Set(vehicles.map(v => v.type))).sort(), [vehicles]);
  const modelsForType = useMemo(() =>
    Array.from(new Set(vehicles.filter(v => !filterType || v.type === filterType).map(v => v.model))).sort(),
    [vehicles, filterType]
  );

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter(d => {
        const fullName = (d.name || '').toLowerCase();
        const username = (d.username || '').toLowerCase();
        const query = searchDriver.toLowerCase();
        return fullName.includes(query) || username.includes(query);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [drivers, searchDriver]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const matchesType = !filterType || v.type === filterType;
        const matchesModel = !filterModel || v.model === filterModel;
        return matchesType && matchesModel;
      })
      .sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
  }, [vehicles, filterType, filterModel]);

  const allDests = Array.from(new Set(selectedReqs.flatMap(r => r.destinations)));
  const [activeDests, setActiveDests] = useState<Set<string>>(new Set(rideToEdit?.acceptedDestinations || allDests));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !date || !time || !selectedVehicleId) return;
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);

    if (rideToEdit) {
      await updateRide(rideToEdit.id, {
        driverName, date, time,
        vehicleId: vehicle?.id,
        plateNumber: vehicle?.plateNumber,
        vehicleModel: vehicle?.model,
        vehicleType: vehicle?.type,
        acceptedDestinations: Array.from(activeDests)
      });
    } else {
      await scheduleRide(
        driverName, date, time, selectedIds, Array.from(activeDests),
        vehicle?.id, vehicle?.plateNumber, vehicle?.model, vehicle?.type
      );
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#ea580c]/10 flex justify-between items-center bg-[#fffaf5]">
          <h2 className="font-black text-lg">Jadualkan Perjalanan</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1">Pemandu</label>
            <div className="relative group">
              <Search size={14} className="absolute left-3.5 top-3.5 text-[#ea580c] opacity-30 group-focus-within:opacity-100" />
              <input
                placeholder="Cari nama pemandu..."
                value={searchDriver}
                onChange={e => setSearchDriver(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#fffaf5] border border-transparent rounded-xl text-xs font-bold outline-none ring-[#ea580c] focus:ring-1 mb-2"
              />
            </div>
            <select value={driverName} onChange={e => setDriverName(e.target.value)} className="w-full p-4 bg-[#fffaf5] border border-[#ea580c]/10 rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" required>
              <option value="">-- Pilih Pemandu --</option>
              {filteredDrivers.map(d => <option key={d.id} value={d.name || d.username}>{d.name || d.username} (@{d.username})</option>)}
            </select>
          </div>
          <div className="space-y-4 p-4 bg-orange-50/50 rounded-3xl border border-[#ea580c]/5">
            <h4 className="text-[10px] font-black uppercase text-[#ea580c] ml-1">Carian Kenderaan</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold opacity-40 ml-1">JENAMA</label>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterModel(''); }} className="w-full p-2.5 bg-white border border-[#ea580c]/10 rounded-xl text-xs font-bold outline-none">
                  <option value="">Semua Jenama</option>
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold opacity-40 ml-1">MODEL</label>
                <select value={filterModel} onChange={e => setFilterModel(e.target.value)} className="w-full p-2.5 bg-white border border-[#ea580c]/10 rounded-xl text-xs font-bold outline-none">
                  <option value="">Semua Model</option>
                  {modelsForType.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold opacity-60 ml-1">PILIH NO PLAT</label>
              <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="w-full p-4 bg-white border border-[#ea580c]/20 rounded-2xl font-black text-sm outline-none ring-[#ea580c] focus:ring-2" required>
                <option value="">-- Pilih Kenderaan --</option>
                {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} ({v.model})</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1"><DateInput label="Tarikh" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block mb-1">Masa</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-3.5 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none focus:ring-1 focus:ring-[#ea580c]" required />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Laluan Terlibat</label>
            {allDests.map(d => (
              <label key={d} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border transition-all ${activeDests.has(d) ? 'bg-[#fffaf5] border-[#ea580c]/20' : 'opacity-40 grayscale bg-gray-50'}`}>
                <Checkbox checked={activeDests.has(d)} onChange={() => {
                  const next = new Set(activeDests);
                  if (next.has(d)) next.delete(d); else next.add(d);
                  setActiveDests(next);
                }} />
                <span className={`text-sm font-bold ${!activeDests.has(d) ? 'line-through' : ''}`}>{d}</span>
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full py-5 text-lg font-black mt-4">Sahkan Tugas</Button>
        </form>
      </motion.div>
    </div>
  );
}

function UserDialog({ user, onClose }: { user: User | null, onClose: () => void }) {
  const { addUser, updateUser } = useAppStore();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState(user?.password || '');
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'REQUESTER');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (user) await updateUser({ ...user, username, password, name, role });
      else await addUser({ username, password, name, role, createdAt: Date.now() });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-sm !p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black">{user ? 'Kemaskini Pengguna' : 'Tambah Pengguna'}</h2>
          <button onClick={onClose}><X /></button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-in shake">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <CustomInput label="ID Pengguna" value={username} onChange={e => setUsername(e.target.value)} required />
          <CustomInput label="Katalaluan" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <CustomInput label="Nama Penuh" value={name} onChange={e => setName(e.target.value)} required />
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-60 ml-1">PERANAN</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-3 bg-[#fffaf5] rounded-xl border border-transparent font-bold outline-none focus:ring-1 focus:ring-[#ea580c]">
              <option value="REQUESTER">Pegawai</option>
              <option value="DRIVER">Pemandu</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button type="submit" className="w-full py-4 font-black mt-4">{user ? 'Simpan Perubahan' : 'Cipta Akaun'}</Button>
        </form>
      </Card>
    </div>
  );
}

function VehicleDialog({ vehicle, onClose }: { vehicle: Vehicle | null, onClose: () => void }) {
  const { addVehicle, updateVehicle } = useAppStore();
  const [plate, setPlate] = useState(vehicle?.plateNumber || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [type, setType] = useState(vehicle?.type || '');
  const [customType, setCustomType] = useState('');
  const [isLainLain, setIsLainLain] = useState(false);

  const PRESET_TYPES = ['Kereta', 'Hilux', 'Van', 'Bas', 'Lori'];

  // Initialize Lain-lain if the existing vehicle type isn't in presets
  useEffect(() => {
    if (vehicle && !PRESET_TYPES.includes(vehicle.type)) {
      setIsLainLain(true);
      setType('Lain-lain');
      setCustomType(vehicle.type);
    }
  }, [vehicle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = type === 'Lain-lain' ? customType : type;
    if (vehicle) await updateVehicle({ ...vehicle, plateNumber: plate, model, type: finalType });
    else await addVehicle({ plateNumber: plate, model, type: finalType });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-sm !p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black">{vehicle ? 'Kemaskini Kenderaan' : 'Tambah Kenderaan'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <CustomInput label="No Plat" placeholder="Contoh: WXX 1234" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} required />
          <CustomInput label="Model" placeholder="Contoh: Toyota Hilux" value={model} onChange={e => setModel(e.target.value)} required />
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-60 ml-1 uppercase">Jenama Kenderaan</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-3 bg-[#fffaf5] rounded-xl border border-transparent font-bold outline-none focus:ring-1 focus:ring-[#ea580c]"
              required
            >
              <option value="">-- Pilih Jenama --</option>
              <option value="Toyota">Toyota</option>
              <option value="Nissan">Nissan</option>
              <option value="Mitsubishi">Mitsubishi</option>
              <option value="Isuzu">Isuzu</option>
              <option value="Hino">Hino</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>
          {type === 'Lain-lain' && (
            <CustomInput label="Sila Nyatakan Jenama" placeholder="Contoh: Mazda..." value={customType} onChange={e => setCustomType(e.target.value)} required />
          )}
          <Button type="submit" className="w-full py-4 font-black mt-4">{vehicle ? 'Simpan Perubahan' : 'Tambah Kenderaan'}</Button>
        </form>
      </Card>
    </div>
  );
}

function EditTripModal({ trip, startStr, setStartStr, endStr, setEndStr, onClose }: { trip: Trip, startStr: string, setStartStr: any, endStr: string, setEndStr: any, onClose: () => void }) {
  const { updateTrip, users, vehicles } = useAppStore();
  const [localTrip, setLocalTrip] = useState<Trip>(trip);

  const save = async () => {
    const startTime = new Date(startStr).getTime();
    let endTime = localTrip.endTime;
    let durationMinutes = localTrip.durationMinutes;
    let status = localTrip.status;

    if (endStr) {
      endTime = new Date(endStr).getTime();
      const durationMs = endTime - startTime;
      durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      status = 'COMPLETED';
    } else {
      endTime = undefined;
      durationMinutes = undefined;
      status = 'ACTIVE';
    }

    await updateTrip({
      ...localTrip,
      startTime,
      endTime,
      durationMinutes,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-[#ea580c]/10 pb-4">
          <h3 className="text-xl font-black flex items-center gap-2 text-[#ea580c]"><Edit2 size={24} /> Kemaskini Log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Tarikh Mula</label>
                <input type="date" value={startStr.split('T')[0]} onChange={e => setStartStr(`${e.target.value}T${startStr.split('T')[1] || '00:00'}`)} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Waktu Mula</label>
                <input type="time" value={startStr.split('T')[1] || ''} onChange={e => setStartStr(`${startStr.split('T')[0]}T${e.target.value}`)} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Tarikh Tamat</label>
                <input type="date" value={endStr.split('T')[0]} onChange={e => setEndStr(`${e.target.value}T${endStr.split('T')[1] || '00:00'}`)} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Waktu Tamat</label>
                <input type="time" value={endStr.split('T')[1] || ''} onChange={e => setEndStr(`${endStr.split('T')[0] || ''}T${e.target.value}`)} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Kenderaan</label>
              <select
                value={localTrip.vehicleId}
                onChange={e => {
                  const v = vehicles.find(vh => vh.id === e.target.value);
                  if (v) setLocalTrip({ ...localTrip, vehicleId: v.id, plateNumber: v.plateNumber, vehicleModel: v.model, vehicleBrand: v.type });
                }}
                className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1"
              >
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Pemandu</label>
              <select
                value={localTrip.driverId}
                onChange={e => {
                  const u = users.find(usr => usr.id === e.target.value);
                  if (u) setLocalTrip({ ...localTrip, driverId: u.id, driverName: u.name || u.username });
                }}
                className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1"
              >
                {users.filter(u => u.role === 'DRIVER').map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Penumpang</label>
            <input value={localTrip.passengers} onChange={e => setLocalTrip({ ...localTrip, passengers: e.target.value })} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#ea580c]/60 ml-1 block">Catatan</label>
            <textarea value={localTrip.remarks} onChange={e => setLocalTrip({ ...localTrip, remarks: e.target.value })} className="w-full p-3 bg-[#fffaf5] border border-transparent rounded-2xl font-bold outline-none ring-[#ea580c] focus:ring-1" rows={2} />
          </div>
        </div>
        <Button onClick={save} className="w-full py-4 font-black">Simpan Perubahan</Button>
      </div>
    </div>
  );
}

function MonthlyTimetable({ driverId, trips, currentMonth, onMonthChange }: { driverId: string, trips: Trip[], currentMonth: Date, onMonthChange: (d: Date) => void }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  const driverTrips = useMemo(() => trips.filter(t => t.driverId === driverId), [trips, driverId]);

  const malayDays = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

  return (
    <div className="bg-white">
      {/* Calendar Header */}
      <div className="p-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-1 text-[#ea580c] hover:opacity-60 transition-all">
            <ChevronLeft size={28} strokeWidth={3} />
          </button>
          <h3 className="text-2xl font-black text-[#431407] min-w-[140px] text-center capitalize tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-1 text-[#ea580c] hover:opacity-60 transition-all">
            <ChevronRight size={28} strokeWidth={3} />
          </button>
        </div>
        <button 
          onClick={() => onMonthChange(new Date())}
          className="px-6 py-3 bg-white border border-[#ea580c]/10 rounded-[18px] text-xs font-black text-[#ea580c] hover:bg-[#ea580c]/5 transition-all shadow-sm"
        >
          Hari Ini
        </button>
      </div>

      <div className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="min-w-[800px] md:min-w-0">
          {/* Days of Week */}
          <div className="grid grid-cols-7 border-b border-[#ea580c]/5">
            {malayDays.map(day => (
              <div key={day} className="py-6 text-center text-[10px] font-black uppercase text-[#ea580c]/30 tracking-[0.2em] border-r border-[#ea580c]/5 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const dayTrips = driverTrips.filter(t => isSameDay(new Date(t.startTime), day));
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toString()} 
                  className={`min-h-[220px] p-3 border-r border-b border-[#ea580c]/5 last:border-r-0 relative flex flex-col gap-2 transition-colors ${!isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'} ${isToday ? 'bg-orange-50/20' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[13px] font-black ${!isCurrentMonth ? 'text-[#431407]/10' : isToday ? 'text-[#ea580c]' : 'text-[#431407]/20'}`}>
                      {format(day, 'd')}
                    </span>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />}
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                    {dayTrips.length > 0 ? (
                      dayTrips.map(trip => (
                        <div key={trip.id} className="bg-emerald-50/60 border border-emerald-100 rounded-[14px] p-2 text-[10px] leading-tight">
                          <div className="flex flex-col font-black text-emerald-700 gap-0.5">
                            <div className="flex items-center justify-between">
                              <span>{format(trip.startTime, 'hh:mm')}</span>
                              <span className="text-[8px] opacity-40">AM</span>
                            </div>
                            {trip.endTime && (
                              <div className="flex items-center justify-between text-blue-600 border-t border-emerald-100 mt-1 pt-1">
                                <span>{format(trip.endTime, 'hh:mm')}</span>
                                <span className="text-[8px] opacity-40">PM</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-1.5 text-[8px] font-bold text-emerald-900/30 truncate">
                            {trip.plateNumber}
                          </div>
                        </div>
                      ))
                    ) : isCurrentMonth ? (
                      <div className="h-full flex flex-col items-center justify-center py-6 opacity-30">
                        <div className="text-red-400 mb-1.5">
                          <X size={16} strokeWidth={3} />
                        </div>
                        <span className="text-[9px] font-black uppercase text-red-400 tracking-tighter text-center leading-tight">Tiada<br/>Mandu</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

