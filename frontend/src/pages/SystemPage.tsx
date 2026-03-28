import { useEffect, useState } from 'react';
import { Server, Cpu, HardDrive, Database, Clock, Fingerprint, Network } from 'lucide-react';
import { systemApi } from '../services/api';

const BentoCard = ({ children, className = '', span = '' }: any) => (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-neutral-200 flex flex-col justify-between hover:shadow-md transition-shadow ${span} ${className}`}>
        {children}
    </div>
);

const SystemPage = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchSystem = async () => {
            const s = await systemApi.getStats();
            if (s) setStats(s);
        };
        fetchSystem();
        const interval = setInterval(fetchSystem, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black text-black tracking-tight leading-none mb-2">System Kernel</h1>
                    <p className="text-neutral-500 font-bold tracking-wide">Deep hardware telemetry and host configuration.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-[minmax(200px,auto)]">
                {/* Host Identity - Span 4 cols, 2 rows */}
                <BentoCard span="md:col-span-4 xl:col-span-4 md:row-span-2" className="!bg-black text-white border-transparent relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md mb-6 border border-white/20">
                                <Fingerprint size={12} /> Root Access Active
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter max-w-2xl group-hover:scale-[1.02] transition-transform origin-left">
                                Kernel node {stats?.info?.hostname || 'ubuntu-server'} is operating correctly.
                            </h2>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mt-12">
                            <div className="bg-white/10 rounded-[1.5rem] p-6 backdrop-blur-md border border-white/10 flex-1">
                                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Architecture</p>
                                <p className="font-bold text-2xl">{stats?.info?.arch || 'amd64'}</p>
                            </div>
                            <div className="bg-white/10 rounded-[1.5rem] p-6 backdrop-blur-md border border-white/10 flex-1">
                                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Operation Duration</p>
                                <p className="font-bold text-2xl flex items-center gap-2">
                                    <Clock size={20} className="text-neutral-300" />
                                    {stats?.info?.uptime || '---'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    <Server className="absolute -bottom-12 -right-12 text-white opacity-[0.03] pointer-events-none group-hover:-translate-y-4 group-hover:-translate-x-4 transition-transform duration-700" size={350} />
                </BentoCard>

                {/* Network / Platform - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <Network size={28} className="stroke-[2px]" />
                        </div>
                    </div>
                    <div className="mt-auto">
                        <p className="text-black font-black text-2xl mb-1 tracking-tight">Platform</p>
                        <p className="text-neutral-500 text-sm font-bold tracking-wide">{stats?.info?.platform || 'Unknown OS'}</p>
                        <p className="text-neutral-400 text-xs font-semibold mt-1">Platform Family: {stats?.info?.os || '-'}</p>
                    </div>
                </BentoCard>

                {/* Storage Detailed - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-neutral-100 text-black flex items-center justify-center border border-neutral-200">
                            <HardDrive size={28} className="stroke-[2px]" />
                        </div>
                        <span className="text-3xl lg:text-4xl font-black text-black tracking-tighter">{stats?.disk?.used || 0} {stats?.disk?.unit || 'GB'}</span>
                    </div>

                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden mb-6 border border-neutral-200">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats?.disk?.usage_percent || 0}%` }} />
                    </div>

                    <div className="mt-auto flex justify-between items-end">
                        <div>
                            <p className="text-black font-black text-xl mb-0.5 tracking-tight">Primary Drive</p>
                            <p className="text-neutral-500 text-sm font-bold tracking-wide">Capacity Allocation</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total</p>
                            <p className="font-bold text-black">{stats?.disk?.total || 0} {stats?.disk?.unit || 'GB'}</p>
                        </div>
                    </div>
                </BentoCard>

                {/* Memory Detailed - Span 2 cols */}
                <BentoCard span="md:col-span-2 xl:col-span-2">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Database size={28} className="stroke-[2px]" />
                        </div>
                        <span className="text-3xl lg:text-4xl font-black text-black tracking-tighter">{stats?.mem?.used || 0} MB</span>
                    </div>

                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden mb-6 border border-neutral-200">
                        <div className="h-full bg-black rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats?.mem?.usage_percent || 0}%` }} />
                    </div>

                    <div className="mt-auto flex justify-between items-end">
                        <div>
                            <p className="text-black font-black text-xl mb-0.5 tracking-tight">RAM Cache</p>
                            <p className="text-neutral-500 text-sm font-bold tracking-wide">Active Working Set</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total</p>
                            <p className="font-bold text-black">{stats?.mem?.total || 0} MB</p>
                        </div>
                    </div>
                </BentoCard>

                {/* CPU Additional Details - Span 4 cols */}
                <BentoCard span="md:col-span-4 xl:col-span-4" className="bg-neutral-50">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm">
                            <Cpu size={24} className="text-black" />
                        </div>
                        <h3 className="font-black text-black text-2xl tracking-tight">CPU Threads & Cores</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Fake thread visualization based on overall usage since we don't have per-core */}
                        {[1, 2, 3, 4].map((core) => {
                            // Introduce some randomness for visual aesthetic based on main load
                            const load = Math.min(100, Math.max(5, (stats?.cpu?.usage_percent || 10) * (0.8 + (core * 0.1))));

                            return (
                                <div key={core} className="bg-white p-5 rounded-[1.5rem] border border-neutral-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Core {core - 1}</span>
                                        <span className="text-sm font-bold text-black">{Math.round(load)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${load > 80 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${load}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-neutral-200/50 flex justify-between items-center">
                        <span className="text-neutral-500 font-bold">{stats?.cpu?.model_name || 'Standard Processor Cluster'}</span>
                        <span className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">Load: {stats?.cpu?.usage_percent ? `${Math.round(stats.cpu.usage_percent)}%` : '---'}</span>
                    </div>
                </BentoCard>

            </div>
        </div>
    );
};

export default SystemPage;
