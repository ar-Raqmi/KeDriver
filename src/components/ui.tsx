import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
import { formatToDDMMYYYY } from '../lib/dateUtils';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'tonal' | 'outlined' | 'text' }>(({ className, variant = 'primary', ...props }, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] gap-2";
  
  const variants = {
    primary: "bg-[#ea580c] text-white border-none rounded-[100px] py-[12px] px-[24px]",
    tonal: "bg-[#ffedd5] text-[#9a3412] border-none rounded-[100px] py-[12px] px-[24px]",
    outlined: "border-[1.5px] border-[#ea580c] text-[#ea580c] bg-transparent rounded-[100px] py-[8px] px-[16px] text-[13px]",
    text: "text-[#ea580c] hover:bg-[#fffaf5] rounded-[100px] py-[12px] px-[24px]"
  };

  return <motion.button ref={ref} whileTap={{ scale: 0.96 }} className={cn(baseClasses, variants[variant], className)} {...props} />;
});

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-[28px] p-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#ea580c]/10 flex flex-col relative overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <div className={cn("text-[14px] font-semibold uppercase tracking-[0.05em] text-[#ea580c] mb-[12px]", className)} {...props}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(({ className, label, id, ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-1 w-full">
      {label && <label htmlFor={id} className="text-[12px] font-bold text-[#431407] uppercase tracking-[0.05em] opacity-80 pl-1">{label}</label>}
      <input
        id={id}
        ref={ref}
        className={cn("flex w-full rounded-[16px] border border-transparent bg-[#fffaf5] px-[12px] py-[10px] text-base transition-colors placeholder:text-[#431407]/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50 text-[#431407] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)]", className)}
        {...props}
      />
    </div>
  );
});

export const DateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(({ className, label, id, value, onChange, ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-1 w-full relative">
      {label && <label htmlFor={id} className="text-[12px] font-bold text-[#431407] uppercase tracking-[0.05em] opacity-80 pl-1">{label}</label>}
      <div className={cn("relative flex items-center w-full rounded-[16px] border border-transparent bg-[#fffaf5] px-[12px] py-[10px] text-base shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)] overflow-hidden focus-within:ring-1 focus-within:ring-[#ea580c]", className)}>
        <span className={value ? "text-[#431407] font-medium" : "text-[#431407]/40"}>
          {value ? formatToDDMMYYYY(value.toString()) : "DD/MM/YYYY"}
        </span>
        <Calendar size={18} className="absolute right-[12px] text-[#431407]/40 pointer-events-none" />
        <input
          id={id}
          ref={ref}
          type="date"
          value={value}
          onChange={onChange}
          onClick={(e) => {
            // Guarantee modern browsers forcefully open picker regardless of CSS layout
            if ('showPicker' in HTMLInputElement.prototype) {
              try {
                e.currentTarget.showPicker();
              } catch (err) {}
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
      </div>
    </div>
  );
});

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn("peer h-5 w-5 shrink-0 rounded-[6px] border-2 border-[#ea580c] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50 accent-[#ea580c]", className)}
      {...props}
    />
  );
});

export const Badge = ({ className, status, children }: { className?: string, status: string, children: React.ReactNode }) => {
  const colorMap: Record<string, string> = {
    // Request statuses
    PENDING: "bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]",
    SCHEDULED: "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30",
    COMPLETED: "bg-gray-50 text-gray-400 border border-gray-200",
    REJECTED: "bg-red-50 text-red-500 border border-red-100",
    EXPIRED: "bg-gray-50 text-gray-400 border border-gray-200",
    CANCELLED: "bg-red-50 text-red-400 border border-red-100",
    
    // Trip status
    ACTIVE: "bg-green-500 text-white border-green-600 shadow-[0_0_12px_rgba(34,197,94,0.3)]",
    
    // Roles
    ADMIN: "bg-[#431407] text-white border-[#431407]",
    DRIVER: "bg-[#ea580c] text-white border-[#ea580c]",
    REQUESTER: "bg-[#ffedd5] text-[#9a3412] border-[#9a3412]/20",
  };
  return (
    <span className={cn("px-[12px] py-[4.5px] rounded-[100px] text-[10px] font-black uppercase tracking-widest border", colorMap[status] || "bg-gray-50 text-gray-600", className)}>
      {children}
    </span>
  );
}

export const Plate = ({ number, className }: { number: string, className?: string }) => (
  <div className={cn("bg-[#1e293b] text-white px-3 py-1.5 rounded-lg font-black text-[11px] inline-flex items-center justify-center border-b-2 border-black/30 shadow-md min-w-[75px] tracking-wider uppercase", className)}>
    {number}
  </div>
);
