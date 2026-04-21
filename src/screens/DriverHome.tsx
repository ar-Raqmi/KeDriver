import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Button, Card, Input as CustomInput, Plate } from '../components/ui';
import { 
  Truck, MapPin, Users, Fingerprint, Clock, Navigation, 
  LogOut, AlertTriangle, CheckCircle, Loader2, StickyNote, RefreshCw, Search, X 
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Trip } from '../types';

export function DriverHome() {
  const { currentUser, logout, trips, vehicles, startTrip, updateTrip } = useAppStore();
  
  // Find active trip for this driver
  const activeTrip = useMemo(() => 
    trips.find(t => t.driverId === currentUser?.id && t.status === 'ACTIVE'),
    [trips, currentUser]
  );
  
  const [isLoading, setIsLoading] = useState(false);
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

  const filteredVehicles = useMemo(() => 
    vehicles.filter(v => {
      const q = vehicleSearchQuery.toLowerCase();
      return (
        v.plateNumber.toLowerCase().includes(q) || 
        v.model.toLowerCase().includes(q) || 
        v.type.toLowerCase().includes(q)
      );
    }),
    [vehicles, vehicleSearchQuery]
  );

  const handleThumbIn = async () => {
    if (!selectedVehicleId || !origin) {
      setError("Sila pilih kenderaan dan lokasi mula.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle || !currentUser) return;

    setIsLoading(true);
    try {
      await startTrip({
        driverId: currentUser.id,
        driverName: currentUser.name || currentUser.username,
        vehicleId: vehicle.id,
        vehicleModel: vehicle.model,
        vehicleBrand: vehicle.type,
        plateNumber: vehicle.plateNumber,
        origin: origin,
        destination: '',
        passengers: passengers,
      });
      setOrigin('');
      setPassengers('');
      setSelectedVehicleId('');
      setVehicleSearchQuery('');
    } catch (e) {
      setError("Gagal memulakan perjalanan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmThumbOut = async () => {
    if (!activeTrip) return;
    
    setIsFinishing(true);
    const endTime = Date.now();
    const durationMs = endTime - activeTrip.startTime;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    try {
      await updateTrip({
        ...activeTrip,
        destination: destination.trim(),
        remarks: remarks.trim(),
        endTime,
        durationMinutes,
        status: 'COMPLETED'
      });
      setDestination('');
      setRemarks('');
      setShowConfirmStop(false);
    } catch (e) {
      setError("Gagal menamatkan perjalanan.");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fff7ed] flex flex-col max-w-md mx-auto text-[#431407]">
       {/* Background Header Decor */}
       <div className="absolute top-0 left-0 right-0 h-64 bg-[#ea580c] rounded-b-[64px] z-0 shadow-lg"></div>

       {/* Header */}
       <header className="relative z-10 p-8 pt-12 text-white flex justify-between items-start">
          <div>
             <h1 className="text-3xl font-black">KeDriver</h1>
             <p className="opacity-80 font-bold mt-1 uppercase tracking-widest text-xs">Pemandu Dashboard</p>
          </div>
          <button onClick={logout} className="p-3 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm shadow-lg">
             <LogOut size={20} />
          </button>
       </header>

       <main className="relative z-10 px-6 pb-12 flex-1">
          <AnimatePresence mode="wait">
            {activeTrip ? (
              <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                 <Card className="!p-8 !rounded-[48px] bg-white shadow-2xl border-none">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]"></div>
                       <span className="text-xs font-black uppercase tracking-tighter text-green-600">Sedang Memandu</span>
                    </div>
                    
                    <div className="space-y-1 mb-8">
                       <Plate number={activeTrip.plateNumber} className="text-4xl py-3 px-6 mb-2" />
                       <p className="text-sm font-bold opacity-40">{activeTrip.vehicleModel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-[#fffaf5] p-5 rounded-3xl border border-[#ea580c]/5 mb-8">
                       <div>
                          <span className="text-[10px] font-black uppercase text-[#ea580c]/40 block mb-1">Lokasi Mula</span>
                          <span className="font-bold flex items-center gap-2"><MapPin size={14} className="text-[#ea580c]"/> {activeTrip.origin}</span>
                       </div>
                       <div>
                          <span className="text-[10px] font-black uppercase text-[#ea580c]/40 block mb-1">Masa Mula</span>
                          <span className="font-bold flex items-center gap-2"><Clock size={14} className="text-[#ea580c]"/> {format(activeTrip.startTime, 'hh:mm a')}</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#431407]/40 ml-1">Destinasi Semasa</label>
                          <input 
                            type="text" 
                            value={destination}
                            onChange={e => {setDestination(e.target.value); setError('');}}
                            placeholder="Tulis destinasi sekarang..."
                            className="w-full p-5 bg-[#fffaf5] border-2 border-transparent focus:border-[#ea580c] rounded-3xl font-black text-lg outline-none transition-all placeholder:text-[#431407]/20"
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#431407]/40 ml-1">Catatan (Pilihan)</label>
                          <textarea 
                             value={remarks}
                             onChange={e => setRemarks(e.target.value)}
                             placeholder="Tambah catatan jika perlu..."
                             rows={2}
                             className="w-full p-5 bg-[#fffaf5] border-2 border-transparent focus:border-[#ea580c] rounded-3xl font-bold outline-none transition-all placeholder:text-[#431407]/20 resize-none"
                          />
                       </div>

                       {error && <div className="text-red-500 text-xs font-bold text-center px-4">{error}</div>}

                       <Button 
                         onClick={() => {
                           if(!destination.trim()) { setError("Sila masukkan destinasi."); return; }
                           setShowConfirmStop(true);
                         }}
                         className="w-full py-6 rounded-[32px] font-black text-xl shadow-xl shadow-[#ea580c]/20"
                       >
                          Berhenti Memandu
                       </Button>
                    </div>
                 </Card>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                 <Card className="!p-8 !rounded-[48px] bg-white shadow-2xl border-none">
                    <div className="mb-8">
                       <h2 className="text-2xl font-black">Selamat Datang,</h2>
                       <p className="text-lg font-bold text-[#ea580c]">{currentUser?.name || currentUser?.username}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#431407]/40 ml-1 flex items-center gap-2">
                            <Search size={14}/> Cari Kenderaan
                          </label>
                          <input 
                            type="text" 
                            value={vehicleSearchQuery}
                            onChange={e => setVehicleSearchQuery(e.target.value)}
                            placeholder="No Plat / Model / Jenama..."
                            className="w-full p-5 bg-[#fffaf5] border-2 border-transparent focus:border-[#ea580c] rounded-3xl font-black text-lg outline-none transition-all placeholder:text-[#431407]/20"
                          />
                          
                          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto px-1 custom-scrollbar">
                             {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                               <button 
                                 key={v.id} 
                                 onClick={() => setSelectedVehicleId(v.id)}
                                 className={`p-4 rounded-3xl border-2 text-left transition-all ${selectedVehicleId === v.id ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-lg' : 'bg-[#fffaf5] border-transparent text-[#431407]'}`}
                               >
                                  <Plate number={v.plateNumber} className="text-lg py-2 px-4 shadow-sm" />
                                  <div className={`text-[10px] font-bold mt-1 uppercase opacity-60 truncate`}>{v.model} • {v.type}</div>
                               </button>
                             )) : <div className="text-center py-8 text-xs font-bold opacity-30">Tiada kenderaan ditemui</div>}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#431407]/40 ml-1">Lokasi Mula</label>
                          <CustomInput value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Workshop / HQ" />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#431407]/40 ml-1">Penumpang</label>
                          <CustomInput value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="Nama / Bilangan" />
                       </div>

                       {error && <div className="text-red-500 text-xs font-bold text-center px-4">{error}</div>}

                       <Button 
                         onClick={handleThumbIn}
                         className="w-full py-6 rounded-[32px] font-black text-xl shadow-xl shadow-[#ea580c]/20"
                       >
                          <Fingerprint className="mr-2"/> Mula Memandu
                       </Button>
                    </div>
                 </Card>
              </motion.div>
            )}
          </AnimatePresence>
       </main>

       {/* Confirm Stop Modal */}
       <AnimatePresence>
          {showConfirmStop && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[40px] w-full max-w-xs shadow-2xl space-y-6 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto text-red-600">
                     <AlertTriangle size={32} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black">Sahkan Berhenti?</h3>
                     <p className="text-sm font-medium opacity-50 mt-1">Anda ingin menamatkan perjalanan di <strong>{destination}</strong>?</p>
                  </div>
                  <div className="flex flex-col gap-2">
                     <Button onClick={handleConfirmThumbOut} disabled={isFinishing} className="w-full py-4 bg-red-500 shadow-red-500/20">
                        {isFinishing ? 'Menyimpan...' : 'Ya, Berhenti'}
                     </Button>
                     <Button variant="tonal" onClick={() => setShowConfirmStop(false)} disabled={isFinishing} className="w-full py-4 bg-gray-100 text-gray-500">
                        Batal
                     </Button>
                  </div>
               </motion.div>
            </div>
          )}
       </AnimatePresence>
    </div>
  );
}
