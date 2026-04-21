import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Check dismissal memory (24 hours)
    const lastDismissed = localStorage.getItem('pwa-dismissed');
    if (lastDismissed) {
      const hoursSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    // 3. Detect Platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');

    // 4. Android prompt listener
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if we are on Android or it's a promptable browser
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Safety Fallback for all Mobile Devices
    // If the event hasn't fired after 6s, we show the manual guide
    if (/iphone|ipad|ipod|android/.test(ua)) {
      setTimeout(() => {
        // If we still haven't seen the prompt (on Android) or it's iOS
        setShow(prev => {
          // If already shown by the event, do nothing
          if (prev) return prev;
          return true;
        });
      }, 6000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa-dismissed', Date.now().toString());
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[200] max-w-sm mx-auto"
        >
          <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[#ea580c]/10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#ea580c]/10 rounded-[18px] flex items-center justify-center text-[#ea580c]">
                  <Download size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-[#431407] text-base">Install App</h3>
                  <p className="text-[11px] font-bold text-[#431407]/40 leading-relaxed max-w-[200px]">Gunakan KeDriver lebih pantas & jimat data dari home screen.</p>
                </div>
              </div>
              <button onClick={dismiss} className="p-1 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {platform === 'ios' || (platform === 'android' && !deferredPrompt) ? (
              <div className="bg-[#fffaf5] rounded-[24px] p-5 border border-[#ea580c]/5 space-y-4">
                <p className="text-[10px] font-black uppercase text-[#ea580c]/60 tracking-[0.15em] text-center">
                  Panduan Install {platform === 'ios' ? 'iOS' : 'Android'}
                </p>
                <div className="flex items-center justify-around text-[11px] font-bold text-[#431407]/60">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-50 text-[#ea580c]">
                      {platform === 'ios' ? <Share size={18}/> : <div className="flex flex-col gap-0.5"><div className="w-1 h-1 bg-current rounded-full" /><div className="w-1 h-1 bg-current rounded-full" /><div className="w-1 h-1 bg-current rounded-full" /></div>}
                    </div>
                    <span>{platform === 'ios' ? "Tekan 'Share'" : "Tekan Menu (⋮)"}</span>
                  </div>
                  <div className="h-8 w-px bg-[#ea580c]/10" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-50 text-[#ea580c]">
                      <PlusSquare size={18} />
                    </div>
                    <span>'Add to Home'</span>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleInstall}
                className="w-full py-4 bg-[#431407] text-white rounded-[20px] font-black text-sm shadow-xl shadow-[#431407]/10 active:scale-[0.98] transition-all"
              >
                Install Sekarang
              </button>
            )}

            <button onClick={dismiss} className="w-full py-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#ea580c]/30 hover:text-[#ea580c] transition-colors">
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
