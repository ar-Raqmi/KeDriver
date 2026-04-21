import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Input, Card } from '../components/ui';
import { Truck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const { login } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Sila masukkan id pengguna dan kata laluan.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Id pengguna atau kata laluan tidak sah.');
      }
    } catch (err) {
      setError('Ralat sambungan. Sila cuba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex bg-[#fff7ed] p-6 flex-col justify-center min-h-[100dvh] max-w-md mx-auto text-[#431407]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, type: "spring" }} className="space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="bg-[#ea580c] p-6 rounded-[32px] text-white shadow-[0_8px_16px_-4px_rgba(234,88,12,0.3)] mb-2">
            <Truck size={64} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#ea580c]">
            KeDriver
          </h1>
          <p className="opacity-60 text-sm font-medium max-w-xs">
            by Syafiq Daniel
          </p>
        </div>

        <Card className="p-8 border-[#ea580c]/20">
          <form onSubmit={submit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2 overflow-hidden">
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="ID Pengguna"
              placeholder="Sila masukkan ID anda"
              value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
              required
            />
            <Input
              label="Kata Laluan"
              type="password"
              placeholder="••••••••"
              value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
              required
            />
            <Button type="submit" disabled={isLoading} className="w-full text-lg mt-2 font-black py-4">
              {isLoading ? 'Sedang Masuk...' : 'Log Masuk'}
            </Button>

          </form>
        </Card>
      </motion.div>
    </div>
  );
}
