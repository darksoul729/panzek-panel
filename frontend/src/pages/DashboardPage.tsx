import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Database, Zap, Activity, Globe, ArrowUpRight, Clock } from 'lucide-react';
import { systemApi, sitesApi } from '../services/api';

const BentoCard = ({ children, className = '', span = '' }: any) => (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-neutral-200 flex flex-col justify-between hover:shadow-md transition-shadow ${span} ${className}`}>
        {children}
    </div>
);

const DashboardPage = () => {
    const [stats, setStats] = useState<any>(null);

    const [activity, setActivity] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const s = await systemApi.getStats();
                if (s) setStats(s);



                const logsRes = await systemApi.getLogs();
                if (logsRes?.data?.logs) setActivity(Array.isArray(logsRes.data.logs) ? logsRes.data.logs : []);

                const sitesRes = await sitesApi.list();
                if (sitesRes?.data) setSites(Array.isArray(sitesRes.data) ? sitesRes.data : []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black text-black tracking-tight leading-none mb-2">Overview</h1>
                    <p className="text-neutral-500 font-bold tracking-wide">Welcome to your command center.</p>
                </div>
            </div>

            {/* True Masonry Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-[minmax(200px,auto)]">

                {/* Hero / Main Status - Span 4 cols, 2 rows */}
                <BentoCard span="md:col-span-4 xl:col-span-4 md:row-span-2" className="!bg-indigo-600 text-white border-transparent relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md mb-6 border border-white/20">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                System Online
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter max-w-2xl group-hover:scale-[1.02] transition-transform origin-left">
                                All external requests are being securely routed.
                            </h2>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mt-12">
                            <div className="bg-white/10 rounded-[1.5rem] p-6 backdrop-blur-md border border-white/20 flex-1">
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Host OS</p>
                                <p className="font-bold text-2xl">{stats?.info?.os || 'Linux'} {stats?.info?.arch}</p>
                            </div>
                            <div className="bg-white/10 rounded-[1.5rem] p-6 backdrop-blur-md border border-white/20 flex-1">
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Uptime</p>
                                <p className="font-bold text-2xl flex items-center gap-2">
                                    <Clock size={20} className="text-indigo-300" />
                                    {stats?.info?.uptime || '---'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    <Globe className="absolute -bottom-12 -right-12 text-white opacity-5 pointer-events-none group-hover:-translate-y-4 group-hover:-translate-x-4 transition-transform duration-700" size={300} />
                </BentoCard>

                {/* CPU - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-black text-white flex items-center justify-center shadow-lg">
                            <Cpu size={28} className="stroke-[2px]" />
                        </div>
                        <span className="text-5xl font-black text-black tracking-tighter">{stats?.cpu?.usage_percent ? `${Math.round(stats.cpu.usage_percent)}%` : '---'}</span>
                    </div>
                    <div className="mt-auto">
                        <p className="text-black font-black text-2xl mb-1 tracking-tight">Processor</p>
                        <p className="text-neutral-500 text-sm font-bold tracking-wide">{stats?.cpu?.model_name || 'Active Cores'}</p>
                    </div>
                </BentoCard>

                {/* Memory - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <Database size={28} className="stroke-[2px]" />
                        </div>
                        <span className="text-5xl font-black text-black tracking-tighter">{stats?.mem?.usage_percent ? `${Math.round(stats.mem.usage_percent)}%` : '---'}</span>
                    </div>
                    <div className="mt-auto">
                        <p className="text-black font-black text-2xl mb-1 tracking-tight">Memory Cache</p>
                        <p className="text-neutral-500 text-sm font-bold tracking-wide">Used: {stats?.mem?.used || 0} MB out of {stats?.mem?.total || 0} MB</p>
                    </div>
                </BentoCard>

                {/* Storage - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-neutral-100 text-black flex items-center justify-center border border-neutral-200">
                            <HardDrive size={28} className="stroke-[2px]" />
                        </div>
                        <span className="text-5xl font-black text-black tracking-tighter">{stats?.disk?.usage_percent ? `${Math.round(stats.disk.usage_percent)}%` : '---'}</span>
                    </div>
                    <div className="mt-auto">
                        <p className="text-black font-black text-2xl mb-1 tracking-tight">Drive Storage</p>
                        <p className="text-neutral-500 text-sm font-bold tracking-wide">{stats?.disk?.total || 0} {stats?.disk?.unit || 'GB'} Available</p>
                    </div>
                </BentoCard>

                {/* Services/Sites - Span 4 cols, 2 rows */}
                <BentoCard span="md:col-span-4 xl:col-span-4 md:row-span-2" className="!p-0 overflow-hidden flex flex-col group">
                    <div className="p-8 border-b border-neutral-200 flex justify-between items-center bg-white">
                        <h3 className="font-black text-black text-2xl flex items-center gap-4 tracking-tight">
                            <div className="bg-indigo-50 w-12 h-12 flex items-center justify-center rounded-[1rem] border border-indigo-100">
                                <Globe size={24} className="text-indigo-600 stroke-[2px]" />
                            </div>
                            Web Architecture Overview
                        </h3>
                        <button onClick={() => window.location.hash = '#sites'} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-5 py-3 rounded-2xl transition-colors flex items-center gap-2">
                            Manage Sites <ArrowUpRight size={18} className="stroke-[2.5px]" />
                        </button>
                    </div>
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-5 bg-neutral-50/50 flex-1">
                        {Array.isArray(sites) && sites.slice(0, 4).map((site) => (
                            <div key={site?.ID || site?.id} className="p-6 rounded-[1.5rem] bg-white border border-neutral-200 transition-all flex justify-between items-center hover:shadow-lg hover:shadow-neutral-200/50 hover:border-neutral-300">
                                <div className="flex items-center gap-5">
                                    <div className={`w-3 h-3 flex-shrink-0 rounded-full shadow-sm outline outline-4 outline-offset-2 ${site?.status?.toLowerCase() === 'active' || site?.status?.toLowerCase() === 'online' ? 'bg-indigo-600 outline-indigo-50' : 'bg-neutral-300 outline-neutral-100'}`} />
                                    <div className="min-w-0">
                                        <p className="font-black text-black text-lg tracking-tight mb-1 truncate">{site?.domain || 'Unknown Domain'}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{site?.type || 'Static'}</p>
                                    </div>
                                </div>
                                <a href={`http://${site?.domain}`} target="_blank" className="w-12 h-12 flex-shrink-0 rounded-[1.2rem] bg-neutral-50 text-neutral-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-sm border border-neutral-200 hover:border-transparent">
                                    <ArrowUpRight size={20} className="stroke-[2.5px]" />
                                </a>
                            </div>
                        ))}
                        {(!sites || sites.length === 0) && (
                            <div className="col-span-2 flex flex-col items-center justify-center py-12">
                                <Globe size={48} className="text-neutral-200 mb-4" />
                                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No Running Sites</p>
                            </div>
                        )}
                    </div>
                </BentoCard>

                {/* Recent Activity - Span 2 cols, 2 rows */}
                <BentoCard span="md:col-span-2 xl:col-span-2 md:row-span-2" className="overflow-hidden bg-neutral-50 border border-neutral-200">
                    <div className="flex items-center justify-between mb-8 pr-2">
                        <h3 className="font-black text-black text-2xl flex items-center gap-4 tracking-tight">
                            <div className="bg-black w-12 h-12 flex items-center justify-center rounded-[1rem] shadow-md shadow-black/20">
                                <Activity size={24} className="text-white stroke-[2.5px]" />
                            </div>
                            Activity
                        </h3>
                    </div>
                    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        {Array.isArray(activity) && activity.slice(0, 6).map((log, i) => (
                            <div key={log?.ID || i} className="flex gap-5 group">
                                <div className="mt-1 w-10 h-10 rounded-[1rem] bg-white flex items-center justify-center shrink-0 border border-neutral-200 shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                                    <Zap size={16} className="text-neutral-400 group-hover:text-white transition-colors stroke-[2.5px]" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-neutral-800 line-clamp-2 leading-snug tracking-wide">{log?.Description || 'Logged event'}</p>
                                    <p className="text-[10px] uppercase font-black text-neutral-400 mt-1.5 tracking-[0.15em]">
                                        {log?.CreatedAt ? new Date(log.CreatedAt).toLocaleTimeString() : 'Just now'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!activity || activity.length === 0) && (
                            <p className="text-neutral-400 text-sm font-bold tracking-wide py-4 bg-white p-4 rounded-2xl text-center border border-neutral-200 border-dashed">No recent activity.</p>
                        )}
                    </div>
                </BentoCard>

            </div>
        </div>
    );
};
export default DashboardPage;
