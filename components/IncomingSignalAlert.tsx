import React from 'react';
import { User } from '../types';
import { Button } from './Components';

interface IncomingSignalAlertProps {
  recruits: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenConsole: () => void;
}

export const IncomingSignalAlert: React.FC<IncomingSignalAlertProps> = ({ 
  recruits, 
  onApprove, 
  onReject, 
  onOpenConsole 
}) => {
  if (recruits.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-96 animate-slide-in">
      <div className="bg-void-light/90 backdrop-blur-xl border border-yellow-500/50 rounded-xl shadow-2xl shadow-yellow-900/20 overflow-hidden">
        <div className="bg-yellow-500/10 p-3 border-b border-yellow-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-500 font-bold font-mono text-sm animate-pulse">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            INCOMING SIGNAL DETECTED
          </div>
          <span className="text-xs text-yellow-700 font-mono">ENCRYPTED</span>
        </div>
        
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {recruits.slice(0, 3).map(recruit => (
            <div key={recruit.id} className="bg-black/40 p-3 rounded border border-gray-700 space-y-2">
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="font-bold text-white text-lg">{recruit.name}</h4>
                   <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1">
                     DEVICE FINGERPRINT:
                   </p>
                   <p className="text-xs text-neon-blue font-mono break-all leading-tight">
                     {recruit.deviceDetails || "UNKNOWN_DEVICE_SIGNATURE"}
                   </p>
                 </div>
               </div>
               
               <div className="flex gap-2 pt-2">
                 <Button 
                   onClick={() => onApprove(recruit.id)} 
                   className="flex-1 bg-green-600 hover:bg-green-500 text-xs py-1"
                 >
                   GRANT
                 </Button>
                 <Button 
                   onClick={() => onReject(recruit.id)} 
                   className="flex-1 bg-red-900/50 hover:bg-red-800 text-xs py-1 border border-red-800"
                 >
                   DENY
                 </Button>
               </div>
            </div>
          ))}
          {recruits.length > 3 && (
            <div className="text-center pt-2">
              <button onClick={onOpenConsole} className="text-xs text-yellow-500 hover:underline">
                View {recruits.length - 3} more in Console
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
