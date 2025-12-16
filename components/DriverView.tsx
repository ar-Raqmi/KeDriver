
import React, { useState, useEffect } from 'react';
import { User, Vehicle, Trip } from '../types';
import { getVehicles, startTrip, endTrip, getActiveTripForDriver } from '../services/storageService';
import { Car, MapPin, Users, Fingerprint, Clock, Navigation, LogOut, AlertTriangle, CheckCircle, Loader2, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

interface DriverViewProps {
  user: User;
  onLogout: () => void;
}

const DriverView: React.FC<DriverViewProps> = ({ user, onLogout }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Start Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [origin, setOrigin] = useState('');
  const [passengers, setPassengers] = useState('');

  // End Form State
  const [destination, setDestination] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const v = await getVehicles();
      setVehicles(v);
      await loadActiveTrip();
      setIsLoading(false);
    };
    init();
  }, [user.id]);

  const loadActiveTrip = async () => {
    const existing = await getActiveTripForDriver(user.id);
    setActiveTrip(existing);
    if (existing) {
      setDestination('');
      setRemarks('');
    }
  };

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
      plateNumber: vehicle.plateNumber,
      origin: origin,
      destination: '', 
      passengers: passengers,
      startTime: Date.now(),
      status: 'ACTIVE'
    };

    try {
      await startTrip(newTrip);
      await loadActiveTrip();
      
      // Reset inputs
      setOrigin('');
      setPassengers('');
      setSelectedVehicleId('');
      setError('');
    } catch (e) {
      setError("Gagal memulakan perjalanan. Periksa sambungan internet.");
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
    setIsLoading(true);

    const endTime = Date.now();
    const durationMs = endTime - activeTrip.startTime;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    const completedTrip: Trip = {
      ...activeTrip,
      destination: destination.trim(),
      remarks: remarks.trim() || undefined,
      endTime,
      durationMinutes,
      status: 'COMPLETED'
    };

    try {
      await endTrip(completedTrip);
      setActiveTrip(null);
      setDestination('');
      setRemarks('');
      setShowConfirmStop(false);
    } catch (e) {
      setError("Gagal menamatkan perjalanan. Periksa internet.");
    } finally {
      setIsLoading(false);
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

  // RENDER: ACTIVE TRIP STATE (Thumb Out Screen)
  if (activeTrip) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col relative text-gray-900">
        {/* Custom Confirmation Modal */}
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
                <button 
                  onClick={() => setShowConfirmStop(false)}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmThumbOut}
                  disabled={isLoading}
                  className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Memproses...' : 'Ya, Tamat'}
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
             <div className="bg-white/20 p-2 rounded-full">
               <Navigation className="w-6 h-6 text-white" />
             </div>
          </div>
          <p className="text-primary-100 text-sm">Anda boleh menutup aplikasi ini. Kembali semula apabila tiba di destinasi.</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 -mt-6 pb-8">
           <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
             
             {/* Info Card */}
             <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 space-y-3">
               <div className="flex justify-between items-center border-b border-primary-100 pb-3">
                 <span className="text-xs text-gray-500 uppercase font-bold">Masa Mula</span>
                 <span className="font-mono font-bold text-gray-800 text-lg">
                   {format(activeTrip.startTime, 'hh:mm a')}
                 </span>
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

             {/* Destination Input (End of Trip) */}
             <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> Di mana anda berhenti?
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={destination}
                    onChange={e => {
                      setDestination(e.target.value);
                      if(error) setError('');
                    }}
                    placeholder="Masukkan lokasi destinasi"
                    className={`w-full pl-4 pr-4 py-4 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg transition-all text-gray-900 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}
                  />
                  {error && (
                    <div className="absolute -bottom-6 left-0 text-red-500 text-xs font-bold flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> {error}
                    </div>
                  )}
                </div>
             </div>

             {/* Remarks (Catatan) Input */}
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary-500" /> Catatan
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Contoh: Isian minyak, masalah tayar..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 resize-none"
                />
             </div>

             <button 
               type="button"
               onClick={validateThumbOut}
               className="w-full py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 mt-4"
             >
               <LogOut className="w-6 h-6" />
               BERHENTI MEMANDU
             </button>
           </div>
        </div>
      </div>
    );
  }

  // RENDER: IDLE STATE (Thumb In Screen)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Header */}
      <div className="bg-primary-500 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div>
             <h1 className="text-3xl font-bold text-white">Hello,</h1>
             <p className="text-primary-100 text-lg">{user.name}</p>
          </div>
          <button onClick={onLogout} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm hover:bg-white/30 transition-colors">
            Keluar
          </button>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-white flex items-center gap-3">
           <Clock className="w-5 h-5" />
           <span className="font-medium">Sedia untuk perjalanan baharu?</span>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
          
          {/* Vehicle Selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Car className="w-4 h-4 text-primary-500" /> Pilih Kenderaan
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {vehicles.length > 0 ? vehicles.map(v => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedVehicleId === v.id 
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                    : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="font-bold text-gray-800">{v.plateNumber}</div>
                  <div className="text-xs text-gray-500">{v.model} • {v.type}</div>
                </button>
              )) : (
                <div className="text-center p-4 text-gray-400 text-sm bg-gray-50 rounded-lg">
                  {isLoading ? 'Memuatkan kenderaan...' : 'Tiada kenderaan didaftarkan.'}
                </div>
              )}
            </div>
          </div>

          {/* Start Location */}
          <div className="space-y-4">
             <div className="relative">
                <label className="text-sm font-bold text-gray-700 mb-2 block">Lokasi Mula</label>
                <div className="absolute left-3 top-9 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                </div>
                <input 
                  type="text" 
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="Dari mana?"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
             </div>
          </div>

          {/* Passengers */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" /> Penumpang
            </label>
            <input 
              type="text" 
              value={passengers}
              onChange={e => setPassengers(e.target.value)}
              placeholder="Nama penumpang / VIP"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
            />
          </div>

          {/* Error Message for Thumb In */}
          {error && !activeTrip && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Action Button */}
          <button 
             type="button"
             onClick={handleThumbIn}
             disabled={isLoading}
             className="w-full py-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
           >
             {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
             {isLoading ? 'SEDANG DIPROSES...' : 'MULA MEMANDU'}
           </button>

        </div>
      </div>
      
      <div className="h-8"></div>
    </div>
  );
};

export default DriverView;
