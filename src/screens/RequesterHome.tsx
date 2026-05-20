import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Input, DateInput, Card, Badge, Plate } from '../components/ui';
import { LogOut, Plus, MapPin, X, Calendar, Clock, Info, Truck, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTo12Hour, formatToDDMMYYYY, getGroupHeader, getTimeCategory, getMalayDayOfWeek } from '../lib/dateUtils';
import { TimePreference } from '../types';

export function RequesterHome() {
  const { currentUser, logout, addRequest, deleteRequest, updateRequest, requests, rides } = useAppStore();
  const [tab, setTab] = useState<'NEW' | 'STATUS'>('NEW');

  // Form & Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [date, setDate] = useState('');
  const [timePref, setTimePref] = useState<string>('08:00');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDestinations = destinations.filter(d => d.trim() !== '');
    if (validDestinations.length === 0 || !date) return;

    if (editingId) {
      await updateRequest(editingId, {
        destinations: validDestinations,
        date,
        timePreference: timePref,
        note
      });
    } else {
      await addRequest({
        destinations: validDestinations,
        date,
        timePreference: timePref,
        note
      });
    }

    resetForm();
    setTab('STATUS');
  };

  const resetForm = () => {
    setDestinations(['']);
    setDate('');
    setNote('');
    setHour(8);
    setMinute(0);
    setAmpm('AM');
    setTimePref('08:00');
    setEditingId(null);
  };

  // Time State
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  // Update timePref when form inputs change
  const updateTimePref = (h: number, m: number, a: 'AM' | 'PM') => {
    let hh = h;
    if (a === 'PM' && hh < 12) hh += 12;
    if (a === 'AM' && hh === 12) hh = 0;
    setTimePref(`${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const handleEdit = (req: any) => {
    setEditingId(req.id);
    setDestinations(req.destinations);
    setDate(req.date);
    
    // Parse timePref for form
    const [h24, m] = req.timePreference.split(':').map(Number);
    const a = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setHour(h12);
    setMinute(m);
    setAmpm(a);
    
    setTimePref(req.timePreference);
    setNote(req.note || '');
    setTab('NEW');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Padam permohonan ini?')) {
      await deleteRequest(id);
    }
  };

  const myRequests = requests.filter(r => r.requesterId === currentUser?.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const allScheduledRequests = requests.filter(r => r.status === 'SCHEDULED' && r.requesterId !== currentUser?.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'REJECTED' | 'PAST'>('ALL');
  const [showGlobal, setShowGlobal] = useState(false);

  const filteredRequests = myRequests.filter(req => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return req.status === 'PENDING';
    if (statusFilter === 'SCHEDULED') return req.status === 'SCHEDULED';
    if (statusFilter === 'REJECTED') return req.status === 'REJECTED';
    if (statusFilter === 'PAST') return ['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(req.status);
    return true;
  });

  const renderRequestCard = (req: any, isMine: boolean = true) => (
    <Card key={req.id} className={`relative !p-[20px] border-none shadow-sm overflow-visible ${!isMine ? 'bg-slate-50 border border-slate-100' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {isMine && <Badge status={req.status}>{req.status}</Badge>}
          {!isMine && (
            <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-200 text-slate-600">
              {req.requesterName || 'Pegawai'}
            </div>
          )}
          {req.status !== 'SCHEDULED' && (
            <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg block w-fit ${
              getTimeCategory(req.timePreference) === 'Pagi' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
              getTimeCategory(req.timePreference) === 'Petang' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
              'bg-purple-100 text-purple-700 border border-purple-200'
            }`}>
              {formatTo12Hour(req.timePreference)}
            </div>
          )}
        </div>
        {isMine && ['PENDING', 'COMPLETED', 'REJECTED'].includes(req.status) && (
          <div className="flex items-center gap-2">
            {req.status === 'PENDING' && (
              <button onClick={() => handleEdit(req)} className="p-2 text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
                <Pencil size={16} />
              </button>
            )}
            <button onClick={() => handleDelete(req.id)} className="p-2 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {(() => {
          if (req.status === 'SCHEDULED') {
            const ride = rides.find(r => r.requestIds.includes(req.id));
            if (ride) {
              return ride.acceptedDestinations.map((d, i) => {
                const isDestMine = isMine && req.destinations.includes(d);
                return (
                  <div key={i} className={`flex items-center gap-[12px] p-[10px] rounded-[16px] border ${isDestMine ? 'bg-[#ea580c]/5 border-[#ea580c] shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <MapPin size={14} className={isDestMine ? "text-[#ea580c]" : "text-gray-400"} />
                    <span className={`font-bold text-[13px] ${isDestMine ? 'text-[#431407]' : 'text-gray-500'}`}>{d}</span>
                  </div>
                );
              });
            }
          }
          return req.destinations.map((d, i) => (
            <div key={i} className="flex items-center gap-[12px] p-[10px] rounded-[16px] bg-[#fffaf5] border border-transparent">
              <MapPin size={14} className="text-[#ea580c] shrink-0" />
              <span className="text-[#431407] font-bold text-[13px]">{d}</span>
            </div>
          ));
        })()}
      </div>

      {req.status === 'SCHEDULED' && (() => {
        const ride = rides.find(r => r.requestIds.includes(req.id));
        if (!ride) return null;
        return (
          <div className="mt-5 space-y-4">
            <div className="p-4 bg-[#ffedd5] rounded-3xl border border-transparent flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="bg-[#ea580c] p-2.5 rounded-2xl text-white shadow-md">
                  <Calendar size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-black text-[#431407]">Tarikh: {getMalayDayOfWeek(req.date)} - {formatToDDMMYYYY(req.date)}</div>
                  <div className="text-[11px] font-bold text-[#9a3412]">
                    {ride.driverName} • {formatTo12Hour(ride.time)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-[#ea580c]/10 pt-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ea580c]/10 p-2 rounded-xl text-[#ea580c]">
                    <Truck size={14} />
                  </div>
                  <div className="text-[11px] font-black uppercase text-[#431407] opacity-80">
                    {ride.vehicleModel || 'Kenderaan'}
                  </div>
                </div>
                {ride.plateNumber && <Plate number={ride.plateNumber} />}
              </div>
            </div>
          </div>
        );
      })()}
    </Card>
  );

  return (
    <div className="flex flex-col bg-[#fff7ed] min-h-[100dvh] max-w-md mx-auto relative overflow-hidden text-[#431407]">
      {/* Header */}
      <div className="bg-[#ea580c] text-white rounded-b-[40px] pt-12 pb-6 px-6 shadow-md z-10 border-b border-[#ea580c]/10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">KeDriver</h1>
              <p className="text-[10px] font-black uppercase opacity-60 mt-1">Sistem Permohonan</p>
            </div>
          </div>
          <button onClick={logout} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors border border-white/10">
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex bg-[#c2410c] p-1 rounded-full">
          <button onClick={() => setTab('NEW')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all ${tab === 'NEW' ? 'bg-white text-[#ea580c] shadow-lg' : 'text-white/80'}`}>
            {editingId ? 'Kemaskini' : 'Permohonan Baru'}
          </button>
          <button onClick={() => { setTab('STATUS'); resetForm(); }} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all ${tab === 'STATUS' ? 'bg-white text-[#ea580c] shadow-lg' : 'text-white/80'}`}>
            Status Saya
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 pb-24 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'NEW' ? (
            <motion.form key="new" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={submit} className="space-y-6">

              <Card className="!p-[20px] space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] ml-1 flex items-center gap-2"><MapPin size={14} /> Destinasi Lawatan</label>
                  {editingId && (
                    <button type="button" onClick={resetForm} className="text-[10px] font-black text-rose-500 uppercase underline">Batal Kemaskini</button>
                  )}
                </div>
                {destinations.map((dest, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={`Contoh: Pejabat, Workshop...`}
                      value={dest}
                      onChange={(e) => {
                        const newD = [...destinations];
                        newD[i] = e.target.value;
                        setDestinations(newD);
                      }}
                    />
                    {destinations.length > 1 && (
                      <button type="button" onClick={() => setDestinations(destinations.filter((_, idx) => idx !== i))} className="p-3 text-[#ea580c] bg-[#ffedd5] shrink-0 rounded-[16px]">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <Button type="button" variant="tonal" className="w-full text-xs font-black uppercase h-10" onClick={() => setDestinations([...destinations, ''])}>
                    <Plus size={16} className="mr-2" /> Tambah Destinasi
                  </Button>
                </div>
              </Card>

              <Card className="!p-[20px] space-y-6">
                <DateInput label="Bila?" required value={date} onChange={e => setDate(e.target.value)} />

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] ml-1 flex items-center gap-2 mb-2"><Clock size={16} /> Keutamaan Masa</label>
                  <div className="flex gap-2">
                    <select
                      value={hour}
                      onChange={e => { const h = parseInt(e.target.value); setHour(h); updateTimePref(h, minute, ampm); }}
                      className="flex-1 rounded-[24px] border border-transparent bg-[#fffaf5] px-[12px] py-[12px] text-base focus:outline-none focus:ring-1 focus:ring-[#ea580c] text-[#431407] font-medium"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={minute}
                      onChange={e => { const m = parseInt(e.target.value); setMinute(m); updateTimePref(hour, m, ampm); }}
                      className="flex-1 rounded-[24px] border border-transparent bg-[#fffaf5] px-[12px] py-[12px] text-base focus:outline-none focus:ring-1 focus:ring-[#ea580c] text-[#431407] font-medium"
                    >
                      <option value={0}>00</option>
                      <option value={30}>30</option>
                    </select>
                    <select
                      value={ampm}
                      onChange={e => { const a = e.target.value as 'AM' | 'PM'; setAmpm(a); updateTimePref(hour, minute, a); }}
                      className="flex-1 rounded-[24px] border border-transparent bg-[#fffaf5] px-[12px] py-[12px] text-base focus:outline-none focus:ring-1 focus:ring-[#ea580c] text-[#431407] font-medium"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] ml-1 flex items-center gap-2 mb-2"><Info size={16} /> Nota (Pilihan)</label>
                  <textarea
                    placeholder="Sila nyatakan jika ada tujuan khas..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="flex w-full rounded-[24px] border border-transparent bg-[#fffaf5] px-[16px] py-[12px] text-base placeholder:text-[#431407]/20 focus:outline-none focus:ring-1 focus:ring-[#ea580c] min-h-[100px] text-[#431407] font-medium"
                  />
                </div>
              </Card>

              <div className="pt-2">
                <Button type="submit" className="w-full text-lg font-black shadow-xl shadow-[#ea580c]/10 py-[20px] rounded-[24px]">
                  {editingId ? 'Simpan Perubahan' : 'Hantar Permohonan'}
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div key="status" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div className="flex bg-[#ea580c]/5 overflow-x-auto rounded-3xl p-1.5 mb-2 border border-[#ea580c]/10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(['ALL', 'PENDING', 'SCHEDULED', 'REJECTED'] as const).map(f => {
                  const labels = { ALL: 'SEMUA', PENDING: 'MENUNGGU', SCHEDULED: 'DITERIMA', REJECTED: 'DITOLAK' };
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f as any)}
                      className={`flex-1 min-w-[85px] py-2.5 px-3 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${statusFilter === f ? 'bg-[#ea580c] text-white shadow-md' : 'text-[#431407]/40 hover:text-[#431407]'}`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase text-[#431407]/40 tracking-widest ml-1 mt-4">Permohonan Saya</div>
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-8 opacity-20">
                    <p className="font-black uppercase tracking-widest text-xs">Tiada permohonan saya</p>
                  </div>
                ) : (
                  filteredRequests.map(req => (
                    <div key={req.id}>{renderRequestCard(req, true)}</div>
                  ))
                )}
              </div>

              {/* Global Scheduled Sessions Section */}
              <div className="mt-10 border-t border-[#ea580c]/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black uppercase text-[#ea580c] tracking-widest ml-1 flex items-center gap-2">
                    <Calendar size={14} /> Jadual Keseluruhan (Pegawai Lain)
                  </div>
                  <button 
                    onClick={() => setShowGlobal(!showGlobal)}
                    className="text-[9px] font-black uppercase text-[#ea580c] bg-[#ea580c]/10 px-3 py-1.5 rounded-full hover:bg-[#ea580c]/20 transition-colors"
                  >
                    {showGlobal ? 'Sembunyi' : 'Lihat Jadual'}
                  </button>
                </div>
                {showGlobal && (
                  allScheduledRequests.length === 0 ? (
                    <div className="text-center py-8 opacity-20">
                      <p className="font-black uppercase tracking-widest text-xs">Tiada jadual lain</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allScheduledRequests.map(req => renderRequestCard(req, false))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
