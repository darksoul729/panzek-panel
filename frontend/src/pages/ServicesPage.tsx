import React, { useEffect, useState } from 'react';
import { Zap, Play, Square, RotateCcw, Plus, Trash2, ShieldCheck, Server, Activity, Monitor, Layers, Info, X, AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import { servicesApi } from '../services/api';

const ServicesPage = () => {
    const [services, setServices] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newService, setNewService] = useState({ name: '', port: '' });

    const fetchServices = async () => {
        try {
            const { data } = await servicesApi.list();
            setServices(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000); // Dynamic update every 10s
        return () => clearInterval(interval);
    }, []);

    const handleControl = async (name: string, action: string) => {
        try {
            await servicesApi.control(name, action);
            fetchServices();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await servicesApi.create({ ...newService, port: parseInt(newService.port) });
            setShowModal(false);
            setNewService({ name: '', port: '' });
            fetchServices();
        } catch (err) {
            alert('Failed to add service');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            await servicesApi.delete(id);
            fetchServices();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const allRunning = services.length > 0 && services.every(s => s.running);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-neutral-900 pointer-events-none">
                    <Layers size={200} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-black flex items-center justify-center rounded-3xl shadow-lg shadow-sm">
                            <Monitor className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-neutral-900 leading-none tracking-tight">Infrastructure Core</h2>
                            <p className="text-neutral-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 ml-0.5">System Process Orchestrator</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="z-10 bg-black hover:bg-black text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 shadow-xl shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Register Service
                </button>
            </div>

            {/* System Health Intelligence Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-neutral-100/50 p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm shadow-sm">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl transition-colors duration-500 ${allRunning ? 'bg-black shadow-sm' : 'bg-black shadow-sm'}`}>
                        {allRunning ? <ShieldCheck className="text-white" size={28} /> : <AlertTriangle className="text-white" size={28} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-neutral-900 tracking-tight">Backend Health</h4>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${allRunning ? 'bg-neutral-200 text-black' : 'bg-neutral-200 text-black'}`}>
                                {allRunning ? 'Optimized' : 'Degraded State'}
                            </span>
                        </div>
                        <p className="text-neutral-500 text-sm font-medium leading-tight">
                            {allRunning
                                ? 'All critical system processes are reporting functional continuity.'
                                : 'One or more services require administrative intervention.'}
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Active Threads</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center text-black">
                            <Activity size={16} />
                        </div>
                        <p className="font-black text-neutral-700 text-sm tracking-tight">{services.filter(s => s.running).length} Services Live</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Host Protocol</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center text-black">
                            <Gauge size={16} />
                        </div>
                        <p className="font-black text-neutral-700 text-sm tracking-tight">Direct Socket</p>
                    </div>
                </div>
            </div>

            {/* Services Performance Grid */}
            <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 px-10 py-6 border-b border-neutral-50 text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50/20">
                    <div className="col-span-4">Process Name</div>
                    <div className="col-span-2">Network Port</div>
                    <div className="col-span-2">Uptime State</div>
                    <div className="col-span-4 text-right">Operational Hub</div>
                </div>

                <div className="divide-y divide-neutral-50">
                    {services.map((service) => (
                        <div key={service.id} className="grid grid-cols-12 px-10 py-8 items-center hover:bg-neutral-50/30 transition-all duration-300 group">
                            <div className="col-span-4 flex items-center gap-5 mr-4">
                                <div className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-colors shadow-sm ${service.running ? 'bg-neutral-100 text-black' : 'bg-neutral-50 text-neutral-400'}`}>
                                    <Zap size={22} fill={service.running ? 'currentColor' : 'none'} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-neutral-800 text-lg leading-tight truncate">{service.name}</span>
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mt-1">System Binary</span>
                                </div>
                            </div>

                            <div className="col-span-2 font-mono text-xs font-black text-neutral-400 flex items-center gap-2">
                                <Server size={12} className="text-neutral-300" />
                                {service.port || 'DYNAMIC'}
                            </div>

                            <div className="col-span-2">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-lg transition-all duration-500 ${service.running ? 'bg-black shadow-sm' : 'bg-black shadow-sm animate-pulse'}`} />
                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tight">{service.running ? 'Connected' : 'Offline'}</span>
                                </div>
                            </div>

                            <div className="col-span-4 flex justify-end gap-3">
                                <div className="flex bg-neutral-50 p-1.5 rounded-3xl gap-2 border border-neutral-200 group-hover:bg-white group-hover:shadow-lg transition-all">
                                    <button
                                        onClick={() => handleControl(service.name, 'start')}
                                        disabled={service.running}
                                        className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-all active:scale-90 disabled:opacity-20"
                                        title="Initiate Process"
                                    >
                                        <Play size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleControl(service.name, 'stop')}
                                        disabled={!service.running}
                                        className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-all active:scale-90 disabled:opacity-20"
                                        title="Terminate Process"
                                    >
                                        <Square size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleControl(service.name, 'restart')}
                                        className="p-3 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-all active:scale-90"
                                        title="Recycle Instance"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-neutral-200 self-center mx-1"></div>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="p-3 text-neutral-300 hover:text-black rounded-xl transition-all active:scale-90"
                                        title="Deregister Service"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && (
                        <div className="p-32 text-center">
                            <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-neutral-200">
                                <RefreshCw size={40} className="animate-spin-slow" />
                            </div>
                            <h4 className="text-xl font-black text-neutral-800 mb-2">No Core Services</h4>
                            <p className="text-neutral-400 max-w-sm mx-auto text-sm leading-relaxed px-10 italic">
                                System registry is empty. Add a service to begin infrastructure monitoring.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Service Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Layers size={100} />
                        </div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-neutral-900 tracking-tight leading-none">Register Service</h3>
                                <p className="text-neutral-400 font-medium text-sm mt-3 flex items-center gap-2">
                                    <Activity size={14} className="text-black" /> Infrastructure recruitment sequence
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-3xl text-neutral-400 hover:text-neutral-600 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Process Identifier</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-black transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Redis"
                                        className="w-full pl-16 pr-6 py-5 rounded-3xl bg-neutral-50 border-2 border-transparent outline-none focus:border-neutral-200 focus:bg-white transition-all font-bold text-neutral-700 tracking-tight"
                                        value={newService.name}
                                        onChange={e => setNewService({ ...newService, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Network Port Access</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-black transition-colors">
                                        <Server size={18} />
                                    </div>
                                    <input
                                        required
                                        type="number"
                                        placeholder="6379"
                                        className="w-full pl-16 pr-6 py-5 rounded-3xl bg-neutral-50 border-2 border-transparent outline-none focus:border-neutral-200 focus:bg-white transition-all font-mono font-bold text-neutral-700"
                                        value={newService.port}
                                        onChange={e => setNewService({ ...newService, port: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-neutral-100/50 p-5 rounded-3xl border border-neutral-200 flex gap-4">
                                <Info className="text-black shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-[10px] text-black font-black uppercase tracking-widest leading-none">Registration Policy</p>
                                    <p className="text-[10px] text-black/80 font-bold leading-relaxed uppercase tracking-tight">
                                        Registered services will be monitored for uptime and allow platform-level cycling commands.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white rounded-3xl py-5 font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Propagating...' : 'Onboard Service'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServicesPage;
