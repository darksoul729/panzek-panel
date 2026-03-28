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
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-neutral-100 text-black rounded-xl">
                        <Terminal size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800">System Logs</h2>
                        <p className="text-sm text-neutral-400">Monitor system events and service status</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="bg-neutral-50 border-none rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 outline-none focus:ring-2 focus:ring-black-100"
                    >
                        <option value="system">System Journal</option>
                        <option value="nginx">Nginx Logs</option>
                    </select>
                    <button
                        onClick={fetchLogs}
                        className={`p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} className="text-neutral-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-neutral-900 rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-800 bg-neutral-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/20 border border-black/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-black/20 border border-black/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-black/20 border border-black/50"></div>
                    </div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Console Output</span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed scrollbar-hide">
                    {logs.length > 0 ? (
                        logs.map((line, i) => (
                            <div key={i} className="flex gap-4 hover:bg-neutral-800/30 -mx-6 px-6 py-0.5 group">
                                <span className="text-neutral-700 select-none w-8 text-right text-xs pt-0.5">{i + 1}</span>
                                <span className="text-neutral-300 break-all">{line}</span>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3">
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
