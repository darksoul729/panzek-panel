import { Terminal as TerminalIcon, Maximize2, RefreshCw } from 'lucide-react';
import Terminal from '../components/Terminal';

const TerminalPage = ({ path }: { path?: string }) => {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-blue-400 rounded-2xl shadow-lg shadow-blue-900/20">
                        <TerminalIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">System Terminal</h2>
                        <p className="text-slate-400 text-xs font-medium">Full shell access to your server environment</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Connected</span>
                    </div>
                    <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all">
                        <RefreshCw size={20} />
                    </button>
                    <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all">
                        <Maximize2 size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-slate-700/50 flex flex-col relative group">
                <div className="absolute top-4 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-md border border-slate-800">
                        SSH / BASH SESSION
                    </span>
                </div>

                <div className="flex-1 p-2">
                    <Terminal path={path} />
                </div>
            </div>
        </div>
    );
};

export default TerminalPage;
