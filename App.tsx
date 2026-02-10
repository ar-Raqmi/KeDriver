
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { getUsers, checkAndSeedAdmin } from './services/storageService';
import { db } from './services/firebaseConfig';
import DriverView from './components/DriverView';
import AdminView from './components/AdminView';
import { Truck, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAndSeedAdmin();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const users = await getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

      if (user) {
        setCurrentUser(user);
        setUsername('');
        setPassword('');
      } else {
        setError("Nama pengguna atau kata laluan salah.");
      }
    } catch (err) {
      console.error(err);
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const DemoBanner = () => {
    if (db) return null;
    return (
      <div className="bg-orange-100 text-orange-800 text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2 border-b border-orange-200">
        <CloudOff className="w-3 h-3" />
        Mod Demo: Data disimpan secara tempatan (Local Storage). Konfigurasi Firebase untuk simpanan awan.
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col">
        <DemoBanner />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border-b-8 border-primary-500 overflow-hidden">

            {/* Header */}
            <div className="bg-primary-500 p-8 text-center text-white relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-10 translate-y-10"></div>

              <div className="relative z-10">
                <div className="bg-white p-3 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
                  <Truck className="w-10 h-10 text-primary-600" />
                </div>
                <h1 className="text-3xl font-bold">KeDriver</h1>
                <p className="text-primary-100 text-sm mt-1 tracking-wide">Log Kenderaan Digital</p>
                <p className="text-primary-100 text-sm mt-1 tracking-wide">by Syafiq Daniel</p>
              </div>
            </div>

            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Log Masuk Akaun</h2>

              <form onSubmit={handleLogin} className="space-y-5">

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nama Pengguna</label>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-gray-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kata Laluan</label>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white py-4 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? 'Sedang Diproses...' : 'Log Masuk'}
                </button>

              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Lupa kata laluan? Sila hubungi CC.
                </p>
                <div className="mt-4 inline-block px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium">Jabatan Kejuruteraan MPS</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-gray-900 flex flex-col h-screen overflow-hidden">
      <DemoBanner />
      <div className={`flex-1 ${currentUser.role === UserRole.HEAD_DRIVER ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {currentUser.role === UserRole.HEAD_DRIVER ? (
          <AdminView user={currentUser} onLogout={handleLogout} />
        ) : (
          <DriverView user={currentUser} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
};

export default App;