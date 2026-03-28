import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Database, Zap, Plus, Activity, Globe, Info, ExternalLink, ShieldCheck } from 'lucide-react';
import StatCard from '../components/StatCard';
import { systemApi, servicesApi, sitesApi } from '../services/api';

const DashboardPage = () => {
    const [stats, setStats] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const s = await systemApi.getStats();
                setStats(s);
                const { data: sData } = await servicesApi.list();
                setServices(sData);
                const { data: lData } = await systemApi.getLogs();
                setActivity(lData.logs || []);
                const { data: sitesData } = await sitesApi.list();
                setSites(sitesData);
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const getSiteStatusColor = (status: string) => {
        switch (status) {
            case 'active': case 'online': return 'bg-emerald-500';
            case 'deploying': return 'bg-blue-500 animate-pulse';
            case 'error': return 'bg-rose-500';
            default: return 'bg-slate-300';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">System Dashboard</h2>
                    <p className="text-slate-500 mt-1">Real-time overview of your server's health</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Server Status</p>
                        <p className="text-sm font-bold text-green-600 flex items-center justify-end gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="CPU Usage"
                    value={stats?.cpu ? `${Math.round(stats.cpu.usage_percent)}%` : '---'}
                    progress={stats?.cpu?.usage_percent || 0}
                    icon={Cpu}
                    color="blue"
                    subtext={stats?.cpu?.model_name || `${stats?.cpu?.cores || 0} Cores`}
                />
                <StatCard
                    title="Memory"
                    value={stats?.mem ? `${Math.round(stats.mem.usage_percent)}%` : '---'}
                    progress={stats?.mem?.usage_percent || 0}
                    icon={Database}
                    color="indigo"
                    subtext={`Used: ${stats?.mem?.used || 0} GB`}
                />
                <StatCard
                    title="Disk Storage"
                    value={stats?.disk ? `${Math.round(stats.disk.usage_percent)}%` : '---'}
                    progress={stats?.disk?.usage_percent || 0}
                    icon={HardDrive}
                    color="amber"
                    subtext={`Total: ${stats?.disk?.total || 0} ${stats?.disk?.unit || 'GB'}`}
                />
                <StatCard
                    title="Active Services"
                    value={services.filter(s => s.status === 'running' || s.running).length}
                    icon={Zap}
                    color="emerald"
                    subtext="All systems nominal"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Services Widget */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Zap size={18} className="text-amber-500" />
                                Core Services
                            </h3>
                            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = '#services' }} className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1">
                                <Plus size={18} /> Manage
                            </a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Service</th>
                                        <th className="px-6 py-4">Port</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {services.slice(0, 5).map((service) => (
                                        <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-700">{service.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-sm">{service.port}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${service.status === 'running' || service.running ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                    }`}>
                                                    {(service.status || 'STOPPED').toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Active Sites Widget */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Globe size={18} className="text-blue-500" />
                                Running Web Sites
                            </h3>
                            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = '#sites' }} className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1">
                                View All
                            </a>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sites.slice(0, 4).map((site) => (
                                <div key={site.ID} className="p-4 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getSiteStatusColor(site.status)}`} />
                                            <p className="font-bold text-slate-700 truncate max-w-[150px]">{site.domain}</p>
                                        </div>
                                        <a href={`http://${site.domain}`} target="_blank" className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-blue-600 hover:shadow-sm transition-all">
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                        <Info size={10} /> {site.type.toUpperCase()} • {site.ip || 'no-ip'}
                                    </p>
                                </div>
                            ))}
                            {sites.length === 0 && (
                                <div className="col-span-2 py-8 text-center text-slate-400 text-sm italic">No sites deployed yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Activity Widget */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500" />
                            Recent Activity
                        </h3>
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {activity.length > 0 ? activity.map((log) => (
                                <div key={log.ID} className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                        <Activity size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 line-clamp-2">{log.Description}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter">{new Date(log.CreatedAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-slate-400 py-10">No recent activity</p>
                            )}
                        </div>
                    </div>

                    {/* Host Details Widget */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-500" />
                                Host Environment
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">OS</span>
                                    <span className="text-sm font-bold text-slate-700">{stats?.info?.os || 'Linux'} {stats?.info?.arch || 'x86_64'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Kernel</span>
                                    <span className="text-sm font-mono text-emerald-600 font-bold">{stats?.info?.kernel || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Panel Version</span>
                                    <span className="text-xs font-black bg-blue-50 px-2.5 py-1 rounded-lg text-blue-600 uppercase tracking-tighter">v2.1.0-ENT</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Uptime</span>
                                    <span className="text-sm font-bold text-slate-600">{stats?.info?.uptime || '---'}</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
