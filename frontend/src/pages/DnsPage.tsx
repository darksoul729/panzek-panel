import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, ShieldCheck, Info, ExternalLink, X, Loader2, Activity, ArrowLeft, PlusCircle as ListPlus, Network, ChevronRight } from 'lucide-react';
import api from '../services/api';

const DnsPage = () => {
    const [zones, setZones] = useState<any[]>([]);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newRecord, setNewRecord] = useState({
        type: 'CNAME',
        name: '',
        content: '',
        proxied: true
    });

    const fetchZones = async () => {
        try {
            const { data } = await api.get('/dns/zones');
            setZones(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRecords = async (zoneId: string) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/dns/zones/${zoneId}/records`);
            setRecords(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchZones();
    }, []);

    const handleSelectZone = (zone: any) => {
        setSelectedZone(zone);
        fetchRecords(zone.id);
    };

    const handleCreateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/dns/zones/${selectedZone.id}/records`, newRecord);
            setShowAdd(false);
            setNewRecord({ type: 'CNAME', name: '', content: '', proxied: true });
            fetchRecords(selectedZone.id);
        } catch (err) {
            alert('Failed to create record');
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/dns/zones/${selectedZone.id}/records/${recordId}`);
            fetchRecords(selectedZone.id);
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (selectedZone) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                {/* Records Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setSelectedZone(null)}
                            className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 hover:text-blue-600 transition-all active:scale-90"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedZone.name}</h2>
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">Live Zone</span>
                            </div>
                            <p className="text-slate-400 font-medium text-sm mt-1">Managing DNS records via Cloudflare Global Edge</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAdd(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-blue-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus size={20} /> New Record
                    </button>
                </div>

                {/* Records List Container */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 px-10 py-6 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/20">
                        <div className="col-span-1">Type</div>
                        <div className="col-span-3">Name / Host</div>
                        <div className="col-span-4">Value / Content</div>
                        <div className="col-span-1">Proxy</div>
                        <div className="col-span-3 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Edge Records...</span>
                            </div>
                        ) : records.map((record) => (
                            <div key={record.id} className="grid grid-cols-12 px-10 py-6 items-center hover:bg-slate-50/30 transition-colors group">
                                <div className="col-span-1">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black tracking-tight border border-slate-200">
                                        {record.type}
                                    </span>
                                </div>
                                <div className="col-span-3 font-bold text-slate-800 tracking-tight">{record.name}</div>
                                <div className="col-span-4 font-mono text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate mr-10">
                                    {record.content}
                                </div>
                                <div className="col-span-1">
                                    {record.proxied ? (
                                        <div className="w-5 h-5 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 border border-amber-200">
                                            <ShieldCheck size={12} />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                            <ExternalLink size={10} />
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-3 text-right">
                                    <button
                                        onClick={() => handleDeleteRecord(record.id)}
                                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Record Modal */}
                {showAdd && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">New DNS Record</h3>
                                <button onClick={() => setShowAdd(false)} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateRecord} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Record Type</label>
                                    <select
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-black text-slate-600 text-sm"
                                        value={newRecord.type}
                                        onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                                    >
                                        {['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Name / Host</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. app or @"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700"
                                        value={newRecord.name}
                                        onChange={e => setNewRecord({ ...newRecord, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Content / Destination</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. 192.168.1.1 or cloudflare.tunnel"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-mono font-bold text-slate-600 text-sm"
                                        value={newRecord.content}
                                        onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                                    />
                                </div>

                                <label className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={newRecord.proxied}
                                            onChange={e => setNewRecord({ ...newRecord, proxied: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-700 tracking-tight">Cloudflare Proxy</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Protect & Accelerate Traffic</span>
                                    </div>
                                </label>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                                >
                                    Push to Registry
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Index Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900 pointer-events-none">
                    <Globe size={200} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-200">
                            <Network className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-none">Cloudflare Control Center</h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 ml-0.5">Global DNS Orchestration</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registry Intel Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-violet-50/50 p-6 rounded-[2.5rem] border border-violet-100 shadow-sm shadow-violet-50">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className="w-16 h-16 bg-violet-600 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl shadow-violet-100">
                        <Activity className="text-white" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">Zone Propagation</h4>
                            <span className="px-3 py-1 bg-violet-100 text-violet-600 rounded-full text-[10px] font-black uppercase tracking-widest">Connected</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-tight">
                            Real-time synchronization with Cloudflare's global edge network is active.
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Network Type</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <Globe size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">Public Anycast</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Security</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                            <ShieldCheck size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">DNSSEC Enabled</p>
                    </div>
                </div>
            </div>

            {/* Domains Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {zones.map((zone) => (
                    <div
                        key={zone.id}
                        onClick={() => handleSelectZone(zone)}
                        className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-500">
                            <Globe size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm">
                                    <Globe size={28} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                {zone.name}
                            </h3>
                            <p className="text-slate-400 text-xs font-medium mb-8">Cloudflare Managed Zone</p>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <ListPlus size={14} className="text-blue-500" /> Manage Records
                                </span>
                                <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </div>
                ))}

                {zones.length === 0 && (
                    <div className="col-span-full p-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                            <Globe size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">No Verified Domains</h4>
                        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed px-10 italic">
                            Add your domain to Cloudflare first. Verified zones will appear here automatically via API sync.
                        </p>
                    </div>
                )}
            </div>

            {/* Instruction Footer Bar */}
            <div className="bg-blue-50/30 border border-blue-50 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-100 shrink-0">
                    <Info size={28} />
                </div>
                <div>
                    <h4 className="text-xl font-black text-slate-800 tracking-tight mb-2">How DNS records affect your panel</h4>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
                        When you deploy a site, a <span className="font-extrabold text-blue-600">CNAME</span> record pointing to your tunnel ingress is created automatically.
                        Use this interface for supplemental records like <span className="font-extrabold text-violet-600">MX</span> (Email),
                        <span className="font-extrabold text-teal-600">TXT</span> (Domain Verification), or custom subdomains.
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Global CDN: ON</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DnsPage;
