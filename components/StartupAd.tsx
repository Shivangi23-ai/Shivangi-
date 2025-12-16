
import React, { useEffect, useState } from 'react';
import { StartupConfig } from '../types';
import { Sparkles, CheckCircle, Zap } from 'lucide-react';

interface Props {
    config: StartupConfig;
    onClose: () => void;
}

export const StartupAd: React.FC<Props> = ({ config, onClose }) => {
    const [timeLeft, setTimeLeft] = useState(config.duration);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [config.duration, onClose]);

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300"
            style={{ backgroundColor: config.bgColor, color: config.textColor }}
        >
            <div className="absolute top-4 right-4 text-xs font-bold opacity-70 border border-current px-3 py-1 rounded-full">
                Auto-closing in {timeLeft}s
            </div>

            <div className="mb-8">
                <Sparkles size={80} className="mx-auto mb-4 animate-bounce" />
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
                    {config.title}
                </h1>
                <div className="h-2 w-32 bg-white/30 rounded-full mx-auto"></div>
            </div>

            <div className="space-y-4 max-w-lg w-full">
                {config.features.map((feat, idx) => (
                    <div 
                        key={idx} 
                        className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-lg transform hover:scale-105 transition-transform"
                    >
                        <div className="bg-white text-black p-2 rounded-full">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-xl font-bold">{feat}</span>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-sm font-bold opacity-60 uppercase tracking-[0.2em] animate-pulse">
                Developed by Nadim Anwar
            </div>
        </div>
    );
};
