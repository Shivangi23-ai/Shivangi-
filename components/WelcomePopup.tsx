
import React from 'react';
import { BrainCircuit } from 'lucide-react';

interface Props {
  onStart: () => void;
  isResume: boolean;
  title?: string;
  message?: string;
  footerText?: string;
}

export const WelcomePopup: React.FC<Props> = ({ onStart, isResume, title, message, footerText }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
       <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
          <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <div className="relative z-10 flex justify-center mb-4">
                 <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <BrainCircuit size={48} className="text-blue-600" />
                 </div>
             </div>
             <h1 className="relative z-10 text-3xl font-extrabold text-white mb-1">NST</h1>
             <p className="relative z-10 text-blue-100 font-medium tracking-widest text-xs uppercase">My Personal Assistant</p>
          </div>

          <div className="p-8 text-center space-y-6">
             <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                   {isResume ? "Welcome Back!" : (title || "AI Smart Study")}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                   {message || "AI ke saath padhai kare smart tarike se. Book jaisa faltu kahaniyo se bache, AI tumko bas jaruri topics hi dega!"}
                </p>
             </div>

             <button 
                onClick={onStart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
             >
                {isResume ? "Resume Learning" : "Get Started"}
             </button>

             <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider mb-1 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">{footerText || "Developed by Nadim Anwar"}</p>
                <p className="text-[10px] text-slate-300">Powered by Gemini AI 2.5</p>
             </div>
          </div>
       </div>
    </div>
  );
};
