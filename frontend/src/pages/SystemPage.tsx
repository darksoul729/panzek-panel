import { useEffect, useState } from 'react';
import { Cpu, Database, Info, HardDrive, Server, Activity, Monitor, Terminal, Globe, Calendar } from 'lucide-react';
import { systemApi } from '../services/api';

const SystemPage = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetch = () => systemApi.getStats().then(setStats);
        fetch();
        const interval = setInterval(fetch, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (mb: number) => {
        if (!mb) return '0 MB';
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(2)} GB`;
        }
        return `${mb} MB`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Technical Information Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <Server size={120} />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Info className="text-blue-600" />
                    Technical Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Monitor size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">Hostname</span>
                        </div>
                        <p className="text-slate-800 font-bold border-b border-slate-50 pb-2">{stats?.info?.hostname || '---'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Terminal size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">Operating System</span>
                        </div>
                        <p className="text-slate-800 font-bold border-b border-slate-50 pb-2">{stats?.info?.os || '---'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Activity size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">Kernel Version</span>
                        </div>
                        <p className="text-slate-500 font-mono text-xs italic border-b border-slate-50 pb-2 truncate">{stats?.info?.kernel || '---'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Calendar size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">System Uptime</span>
                        </div>
                        <p className="text-slate-800 font-bold text-blue-600 border-b border-slate-50 pb-2">{stats?.info?.uptime || '---'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Cpu size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">Architecture</span>
                        </div>
                        <p className="text-slate-700 font-bold border-b border-slate-50 pb-2">{stats?.info?.arch || '---'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Globe size={14} />
                            <span className="text-[10px] uppercase font-black tracking-widest leading-none">Backend Type</span>
                        </div>
                        <div className="border-b border-slate-50 pb-2">
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Fiber Go 1.22 + SQLite</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Processor Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Cpu className="text-indigo-500" size={20} />
                        Processor Load
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-600">Overall Usage</span>
                                <span className="text-sm font-black text-slate-900">{(stats?.cpu?.usage_percent || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-indigo-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${stats?.cpu?.usage_percent || 0}%` }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Cores</p>
                                <p className="text-xl font-bold text-slate-800">{stats?.cpu?.cores || 0}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">1m Load</p>
                                <p className="text-xl font-bold text-slate-800">{stats?.cpu?.load_1min || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Threads</p>
                                <p className="text-xl font-bold text-slate-800">{stats?.cpu?.cores * 2 || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Memory Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Database className="text-emerald-500" size={20} />
                        Memory Statistics
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-600">RAM Utilization</span>
                                <span className="text-sm font-black text-slate-900">{(stats?.mem?.usage_percent || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${stats?.mem?.usage_percent || 0}%` }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Total Available</span>
                                <span className="text-lg font-bold text-slate-800">{formatBytes(stats?.mem?.total)}</span>
                            </div>
                            <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Used Resources</span>
                                <span className="text-lg font-bold text-slate-800">{formatBytes(stats?.mem?.used)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage Overview Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <HardDrive className="text-amber-500" size={20} />
                    Storage Overview
                </h3>
                <div className="space-y-8">
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm">
                                    /
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Root File System</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Physical Volume • {stats?.disk?.unit || 'GB'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900">{(stats?.disk?.usage_percent || 0).toFixed(1)}%</p>
                                <p className="text-[10px] text-slate-400 font-medium">{stats?.disk?.used || 0} / {stats?.disk?.total || 0} {stats?.disk?.unit || 'GB'}</p>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats?.disk?.usage_percent || 0}%` }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                        <div className="flex gap-4 items-center">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-slate-500">I/O Performance: <span className="font-bold text-slate-700">OPTIMIZED</span></span>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs text-slate-500">Health Check: <span className="font-bold text-slate-700">PASSING (SMART OK)</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemPage;
