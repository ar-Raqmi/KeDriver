
import React, { useState, useEffect } from 'react';
import { User, Vehicle, Trip } from '../types';
import { getVehicles, startTrip, updateTrip, getActiveTripForDriver } from '../services/storageService';
import { Car, MapPin, Users, Fingerprint, Clock, Navigation, LogOut, AlertTriangle, CheckCircle, Loader2, StickyNote, RefreshCw, Search, X } from 'lucide-react';
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
  const [isFinishing, setIsFinishing] = useState(false);
  
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
    try {
      const v = await getVehicles();
      setVehicles(v);
      const existing = await getActiveTripForDriver(user.id);
      setActiveTrip(existing);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const v = await getVehicles();
      setVehicles(v);
      const existing = await getActiveTripForDriver(user.id);
      setActiveTrip(existing);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  }

  const handleThumbIn = async () => {
    if (!selectedVehicleId || !origin) {
      setError("Sila pilih kenderaan dan lokasi mula.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsLoading(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) {
      setIsLoading(false);
      return;
    }

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
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmThumbOut = async () => {
    if (!activeTrip || !activeTrip.id) {
      setError("Ralat: ID perjalanan tidak dijumpai.");
      return;
    }
    
    setIsFinishing(true);
    const endTime = Date.now();
    const durationMs = endTime - activeTrip.startTime;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    const completedTrip: Trip = {
      ...activeTrip,
      destination: destination.trim(),
      remarks: remarks.trim() || '',
      endTime,
      durationMinutes,
      status: 'COMPLETED'
    };

    try {
      await updateTrip(completedTrip);
      
      setActiveTrip(null);
      setDestination('');
      setRemarks('');
      setShowConfirmStop(false);
    } catch (e: any) {
      console.error("Gagal menamatkan perjalanan:", e);
      setError("Gagal menyimpan data. Sila periksa talian internet anda.");
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsFinishing(false);
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

  if (isLoading && !activeTrip) {
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl space-y-6 text-gray-900 border-t-8 border-red-500 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600 rotate-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900">Sahkan Destinasi</h3>
                <p className="text-gray-500 mt-2 font-medium leading-relaxed">
                  Adakah anda ingin menamatkan perjalanan ke <span className="text-red-600 font-bold underline">{destination}</span> sekarang?
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                 <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>KENDERAAN</span>
                    <span>LOKASI MULA</span>
                 </div>
                 <div className="flex justify-between text-sm font-black text-gray-700">
                    <span>{activeTrip.plateNumber}</span>
                    <span>{activeTrip.origin}</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  disabled={isFinishing}
                  onClick={handleConfirmThumbOut} 
                  className="w-full py-5 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black rounded-2xl shadow-xl shadow-red-500/30 transition-all flex items-center justify-center gap-3"
                >
                  {isFinishing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                  {isFinishing ? 'MENYIMPAN...' : 'YA, TAMAT SEKARANG'}
                </button>
                <button 
                  disabled={isFinishing}
                  onClick={() => setShowConfirmStop(false)} 
                  className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all"
                >
                  BATAL
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
                  <span className="text-xs font-bold uppercase tracking-wider">Sedang Memandu</span>
                </div>
                <h1 className="text-2xl font-black">{activeTrip.plateNumber}</h1>
             </div>
             <div className="flex gap-2">
                <button onClick={refreshData} className={`bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}>
                 <RefreshCw className="w-6 h-6 text-white" />
               </button>
             </div>
          </div>
          <p className="text-primary-100 text-sm font-medium">Sila isi lokasi berhenti di bawah setelah sampai.</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 -mt-6">
           <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
             <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-primary-400 font-black uppercase block mb-1">Dari</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1"><MapPin className="w-3 h-3" /> {activeTrip.origin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-primary-400 font-black uppercase block mb-1">Mula</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1"><Clock className="w-3 h-3" /> {format(activeTrip.startTime, 'hh:mm a')}</span>
                  </div>
             </div>

             <div className="space-y-4">
                <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-red-500" /> Destinasi Sekarang
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={destination} 
                    onChange={e => { setDestination(e.target.value); if(error) setError(''); }} 
                    placeholder="Contoh: Pejabat, Workshop, Tapak..." 
                    className={`w-full px-5 py-5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-lg font-bold transition-all text-gray-900 ${error ? 'border-red-500' : 'border-gray-100'}`} 
                  />
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary-500" /> Catatan Perjalanan
                </label>
                <textarea 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)} 
                  placeholder="Isi jika ada masalah kenderaan atau isian minyak..." 
                  rows={3} 
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-gray-900 font-medium resize-none" 
                />
             </div>

             {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold animate-shake">{error}</div>}

             <button 
               type="button" 
               onClick={() => {
                 if(!destination.trim()) {
                   setError("Sila masukkan destinasi sebelum menamatkan perjalanan.");
                   return;
                 }
                 setShowConfirmStop(true);
               }} 
               className="w-full py-5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-3 mt-4"
             >
               <LogOut className="w-6 h-6" /> TAMAT PERJALANAN
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
             <h1 className="text-3xl font-black text-white">Selamat Datang,</h1>
             <p className="text-primary-100 text-lg font-bold">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshData} className={`bg-white/20 text-white p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="bg-white/20 text-white px-4 py-2 rounded-full text-xs font-black backdrop-blur-sm hover:bg-white/30 transition-colors uppercase tracking-widest">Keluar</button>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-white flex items-center gap-3">
           <Car className="w-5 h-5" />
           <span className="font-bold">Sedia untuk perjalanan baharu hari ini?</span>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-white rounded-[2rem] shadow-xl p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Car className="w-4 h-4 text-primary-500" /> Kenderaan Digunakan
              </label>
              
              <div className="relative w-full group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Cari No Plat / Jenis..."
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-5 bg-gray-50 border-2 border-gray-100 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 rounded-2xl text-lg font-black outline-none transition-all shadow-md placeholder:font-normal placeholder:text-gray-400"
                />
                {vehicleSearchQuery && (
                   <button onClick={() => setVehicleSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 bg-gray-200/50 rounded-full transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-1 pb-2 custom-scrollbar rounded-xl bg-gray-50/50 p-2 border border-gray-100">
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
                    <div className="font-black text-xl text-gray-800 tracking-tight uppercase">{v.plateNumber}</div>
                    <div className="text-[9px] font-black text-primary-700 bg-primary-100 px-3 py-1 rounded-full uppercase tracking-widest">{v.type}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-bold uppercase">{v.model}</div>
                </button>
              )) : (
                <div className="text-center p-12 text-gray-400 text-xs font-bold uppercase border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                  {vehicles.length === 0 ? 'Memuatkan...' : 'Tiada Kenderaan Dijumpai'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-wide">
               <MapPin className="w-4 h-4 text-primary-500" /> Lokasi Mula
             </label>
             <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Contoh: Stor / Pejabat / Bengkel" className="w-full px-5 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-gray-900 text-lg font-black shadow-sm placeholder:font-normal" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-wide">
              <Users className="w-4 h-4 text-primary-500" /> Penumpang (Pilihan)
            </label>
            <input type="text" value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="Nama / Bilangan Penumpang" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-gray-900 font-bold shadow-sm" />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-black flex items-center gap-3 border border-red-100 animate-shake">
              <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}

          <button 
            type="button" 
            onClick={handleThumbIn} 
            disabled={isLoading} 
            className="w-full py-5 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-primary-500/40 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
          >
             {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Fingerprint className="w-8 h-8" />}
             {isLoading ? 'SEDANG MULA...' : 'MULA MEMANDU'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default DriverView;