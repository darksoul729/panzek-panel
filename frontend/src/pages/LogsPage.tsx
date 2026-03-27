import { useEffect, useState } from 'react';
import { Terminal, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';

const LogsPage = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [type, setType] = useState('system');
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/logs/${type}`);
            setLogs(data.logs || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, [type]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Terminal size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">System Logs</h2>
                        <p className="text-sm text-slate-400">Monitor system events and service status</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="system">System Journal</option>
                        <option value="nginx">Nginx Logs</option>
                    </select>
                    <button
                        onClick={fetchLogs}
                        className={`p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} className="text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Console Output</span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed scrollbar-hide">
                    {logs.length > 0 ? (
                        logs.map((line, i) => (
                            <div key={i} className="flex gap-4 hover:bg-slate-800/30 -mx-6 px-6 py-0.5 group">
                                <span className="text-slate-700 select-none w-8 text-right text-xs pt-0.5">{i + 1}</span>
                                <span className="text-slate-300 break-all">{line}</span>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                            <AlertCircle size={32} strokeWidth={1.5} />
                            <p>No log data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsPage;
