
import React, { useState, useEffect } from 'react';
import { User, Vehicle, Trip } from '../types';
import { getVehicles, startTrip, endTrip, getActiveTripForDriver } from '../services/storageService';
import { Car, MapPin, Users, Fingerprint, Clock, Navigation, LogOut, AlertTriangle, CheckCircle, Loader2, StickyNote, RefreshCw, WifiOff, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface DriverViewProps {
  user: User;
  onLogout: () => void;
}

const DriverView: React.FC<DriverViewProps> = ({ user, onLogout }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Start Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [origin, setOrigin] = useState('');
  const [passengers, setPassengers] = useState('');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');

  // End Form State
  const [destination, setDestination] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  useEffect(() => {
    initData();
  }, [user.id]);

  const initData = async () => {
    setIsLoading(true);
    await refreshData();
    setIsLoading(false);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const v = await getVehicles();
      setVehicles(v);
      await loadActiveTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  }

  const loadActiveTrip = async () => {
    try {
      const existing = await getActiveTripForDriver(user.id);
      setActiveTrip(existing);
      if (existing) {
        setDestination('');
        setRemarks('');
      }
    } catch (e) {
      console.warn("Failed to load active trip", e);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const query = vehicleSearchQuery.toLowerCase();
    return (
      v.plateNumber.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.type.toLowerCase().includes(query)
    );
  });

  const handleThumbIn = async () => {
    if (!selectedVehicleId || !origin) {
      setError("Sila pilih kenderaan dan lokasi mula.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const newTrip: Trip = {
      id: '', 
      driverId: user.id,
      driverName: user.name,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      vehicleBrand: vehicle.type,
      plateNumber: vehicle.plateNumber,
      origin: origin,
      destination: '', 
      passengers: passengers,
      startTime: Date.now(),
      status: 'ACTIVE'
    };

    try {
      const newId = await startTrip(newTrip);
      setActiveTrip({ ...newTrip, id: newId });
      setOrigin('');
      setPassengers('');
      setSelectedVehicleId('');
      setVehicleSearchQuery('');
      setError('');
    } catch (e) {
      setError("Gagal memulakan perjalanan. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateThumbOut = () => {
    if (!destination.trim()) {
      setError("Sila masukkan lokasi destinasi.");
      setTimeout(() => setError(''), 3000);
      return;
    }
    setError('');
    setShowConfirmStop(true);
  };

  const handleConfirmThumbOut = async () => {
    if (!activeTrip) return;
    
    const endTime = Date.now();
    const durationMs = endTime - tripToComplete.startTime;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    const completedTrip: Trip = {
      ...tripToComplete,
      destination: destination.trim(),
      remarks: remarks.trim() || undefined,
      endTime,
      durationMinutes,
      status: 'COMPLETED'
    };

    setShowConfirmStop(false);
    setActiveTrip(null); 
    setDestination('');
    setRemarks('');
    
    try {
      await endTrip(completedTrip);
      console.log("Trip sync initiated successfully");
    } catch (e) {
      console.error("Background sync failed, Firestore will retry automatically:", e);
    }
  };

  if (isLoading && !activeTrip && vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
           <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
           <p className="text-gray-500 font-medium">Memuatkan data...</p>
        </div>
      </div>
    );
  }

  if (activeTrip) {
    return (
      <div className="min-h-full bg-amber-50 flex flex-col relative text-gray-900 overflow-y-auto pb-24">
        {/* Modal */}
        {showConfirmStop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-gray-900">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">Tamat Perjalanan?</h3>
                <p className="text-gray-500 mt-2">Pastikan anda telah tiba di destinasi dan kenderaan diparkir dengan selamat.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setShowConfirmStop(false)} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Batal</button>
                <button onClick={handleConfirmThumbOut} className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-colors">
                  Ya, Tamat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-primary-500 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
             <div>
                <div className="flex items-center gap-2 mb-1 opacity-90">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Status Semasa</span>
                </div>
                <h1 className="text-2xl font-bold">Sedang Memandu</h1>
             </div>
             <div className="flex gap-2">
                <button onClick={refreshData} className={`bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} title="Refresh Data">
                 <RefreshCw className="w-6 h-6 text-white" />
               </button>
               <div className="bg-white/20 p-2 rounded-full">
                 <Navigation className="w-6 h-6 text-white" />
               </div>
             </div>
          </div>
          <p className="text-primary-100 text-sm">Kembali semula ke aplikasi ini apabila anda tiba di destinasi.</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 -mt-6">
           <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
             <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 space-y-3">
               <div className="flex justify-between items-center border-b border-primary-100 pb-3">
                 <span className="text-xs text-gray-500 uppercase font-bold">Masa Mula</span>
                 <span className="font-mono font-bold text-gray-800 text-lg">{format(activeTrip.startTime, 'hh:mm a')}</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Kenderaan</span>
                    <span className="font-bold text-gray-800">{activeTrip.plateNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Dari</span>
                    <span className="font-bold text-gray-800 truncate">{activeTrip.origin}</span>
                  </div>
               </div>
             </div>

             <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> Di mana anda berhenti?
                </label>
                <div className="relative">
                  <input type="text" value={destination} onChange={e => { setDestination(e.target.value); if(error) setError(''); }} placeholder="Masukkan lokasi destinasi" className={`w-full pl-4 pr-4 py-4 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-lg transition-all text-gray-900 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`} />
                  {error && <div className="absolute -bottom-6 left-0 text-red-500 text-xs font-bold flex items-center gap-1 animate-pulse"><AlertTriangle className="w-3 h-3" /> {error}</div>}
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary-500" /> Catatan (Pilihan)
                </label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Contoh: Isian minyak, masalah tayar..." rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 resize-none" />
             </div>

             <button type="button" onClick={validateThumbOut} className="w-full py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 mt-4">
               <LogOut className="w-6 h-6" /> BERHENTI MEMANDU
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col text-gray-900 overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-primary-500 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg shrink-0">
        <div className="flex justify-between items-start mb-6">
          <div>
             <h1 className="text-3xl font-bold text-white">Hello,</h1>
             <p className="text-primary-100 text-lg">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshData} className={`bg-white/20 text-white p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} title="Refresh Data">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="bg-white/20 text-white px-3 py-2 rounded-full text-sm backdrop-blur-sm hover:bg-white/30 transition-colors">Keluar</button>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-white flex items-center gap-3">
           <Clock className="w-5 h-5" />
           <span className="font-medium">Sedia untuk perjalanan baharu?</span>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Car className="w-4 h-4 text-primary-500" /> Pilih Kenderaan
              </label>
              
              <div className="relative w-full group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Cari No Plat..."
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-5 bg-gray-50 border-2 border-gray-100 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 rounded-2xl text-lg font-bold outline-none transition-all shadow-md placeholder:font-normal placeholder:text-gray-400"
                />
                {vehicleSearchQuery && (
                   <button onClick={() => setVehicleSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 bg-gray-200/50 rounded-full transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                )}
              </div>
            </div>

            {/* Scrollable Vehicle List */}
            <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-1 pb-2 custom-scrollbar border border-gray-100 rounded-xl bg-gray-50/50 p-2">
              {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                    selectedVehicleId === v.id 
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100 shadow-md' 
                    : 'border-white bg-white hover:border-primary-200 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-xl text-gray-800 tracking-tight">{v.plateNumber}</div>
                    <div className="text-[10px] font-black text-primary-700 bg-primary-100 px-2.5 py-1 rounded-full uppercase tracking-widest">{v.type}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 font-medium">{v.model}</div>
                </button>
              )) : (
                <div className="text-center p-12 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
                  {vehicles.length === 0 
                    ? (isLoading ? 'Memuatkan...' : 'Tiada kenderaan.')
                    : 'Tiada padanan carian.'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
             <div className="relative">
                <label className="text-sm font-bold text-gray-700 mb-2 block">Lokasi Mula</label>
                <div className="absolute left-4 top-11 text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                </div>
                <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Contoh: Pejabat / Stor" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-gray-900 text-lg font-bold shadow-sm" />
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" /> Penumpang (Pilihan)
            </label>
            <input type="text" value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="Siapa ikut sekali?" className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-gray-900 text-lg font-bold shadow-sm" />
          </div>

          {error && !activeTrip && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100 shadow-sm animate-shake">
              <AlertTriangle className="w-6 h-6 shrink-0" /> {error}
            </div>
          )}

          <button type="button" onClick={handleThumbIn} disabled={isLoading} className="w-full py-5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-3xl font-black text-xl shadow-xl shadow-primary-500/40 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 active:scale-95">
             {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Fingerprint className="w-8 h-8" />}
             {isLoading ? 'SEDANG DIPROSES...' : 'MULA MEMANDU'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default DriverView;