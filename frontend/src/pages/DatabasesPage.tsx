import { useEffect, useState } from 'react';
import { Database, Plus, Trash2, Table, ChevronDown, X, Loader2, ShieldCheck, Lock, Server, Info, Activity, Zap, Layers, RefreshCw } from 'lucide-react';
import api from '../services/api';

const DatabasesPage = () => {
    const [databases, setDatabases] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newDb, setNewDb] = useState({ name: '', username: '', password: '' });
    const [expandedDb, setExpandedDb] = useState<number | null>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);

    const fetchDatabases = async () => {
        try {
            const { data } = await api.get('/databases');
            setDatabases(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDatabases();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/databases', newDb);
            setShowAdd(false);
            setNewDb({ name: '', username: '', password: '' });
            fetchDatabases();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create database');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Are you sure you want to delete database "${name}"?`)) return;
        try {
            await api.delete(`/databases/${name}`);
            fetchDatabases();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const toggleExpand = async (dbId: number, dbName: string) => {
        if (expandedDb === dbId) {
            setExpandedDb(null);
            return;
        }

        setExpandedDb(dbId);
        setLoadingTables(true);
        setTables([]);
        try {
            const { data } = await api.get(`/databases/${dbName}/tables`);
            setTables(data || []);
        } catch (err) {
            console.error('Failed to fetch tables');
        } finally {
            setLoadingTables(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900 pointer-events-none">
                    <Database size={200} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-amber-500 flex items-center justify-center rounded-2xl shadow-lg shadow-amber-100">
                            <Database className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-none">Data Engine Orchestrator</h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 ml-0.5">High Performance SQL Clusters</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowAdd(true)}
                    className="z-10 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-amber-100 transition-all hover:-translate-y-0.5 active:scale-95 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Instance
                </button>
            </div>

            {/* Platform Intel Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100 shadow-sm shadow-amber-50">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl shadow-amber-100">
                        <Lock className="text-white" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">Security Clearance</h4>
                            <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Encrypted Root</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-tight">
                            Platform-level administrative access is active and secured.
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Engine Version</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <Server size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">MySQL 8.0 GA</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Protocol</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                            <ShieldCheck size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">Native x-Auth</p>
                    </div>
                </div>
            </div>

            {/* Clusters Grid */}
            <div className="space-y-4">
                {databases.map((db) => (
                    <div key={db.ID} className="group overflow-hidden">
                        <div
                            onClick={() => toggleExpand(db.ID, db.name)}
                            className={`p-6 rounded-[2rem] transition-all cursor-pointer border ${expandedDb === db.ID ? 'bg-amber-50/30 border-amber-100 mb-2' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-lg shadow-sm'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${expandedDb === db.ID ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500'}`}>
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{db.name}</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Layers size={10} className="text-slate-300" /> Storage Node
                                            </span>
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Master Node</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Zap size={14} className="text-amber-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Connection</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(db.name); }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className={`p-2 transition-transform duration-300 ${expandedDb === db.ID ? 'rotate-180 text-amber-500' : 'text-slate-300'}`}>
                                        <ChevronDown size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tables Expanded View */}
                        {expandedDb === db.ID && (
                            <div className="mx-4 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-amber-50/50 p-8 shadow-inner animate-in slide-in-from-top-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                            <Table size={16} />
                                        </div>
                                        <h4 className="font-black text-slate-700 tracking-tight">Schema Index</h4>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(db.ID, db.name); }}
                                        className="text-[10px] font-black text-slate-400 hover:text-amber-500 uppercase tracking-widest flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw size={12} /> Sync Schema
                                    </button>
                                </div>

                                {loadingTables ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <div className="relative">
                                            <Loader2 size={48} className="animate-spin text-amber-200" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Scanning Data Nodes...</p>
                                    </div>
                                ) : tables.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {tables.map(table => (
                                            <div key={table} className="group/table flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all cursor-default relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-0 group-hover/table:opacity-100 transition-opacity" />
                                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover/table:bg-amber-50 group-hover/table:text-amber-500 transition-colors">
                                                    <Table size={14} />
                                                </div>
                                                <span className="font-bold text-slate-600 text-xs truncate uppercase tracking-tight">{table}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200 shadow-sm">
                                            <Info size={32} />
                                        </div>
                                        <p className="text-slate-400 font-bold text-sm italic">Empty Schema Cluster</p>
                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mt-2">No functional tables detected in this node.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {databases.length === 0 && (
                    <div className="p-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                            <Activity size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">No Databases Initialized</h4>
                        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed px-10 italic">
                            Provision high-speed SQL nodes by clicking the New Instance button.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Db Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Database size={100} />
                        </div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">New Database</h3>
                                <p className="text-slate-400 font-medium text-sm mt-3 flex items-center gap-2">
                                    <Server size={14} className="text-amber-500" /> Instance virtualization sequence
                                </p>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Database Identity (Name)</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">
                                        <Database size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. production_main"
                                        className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-amber-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                        value={newDb.name}
                                        onChange={e => setNewDb({ ...newDb, name: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Database User</label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="User"
                                            className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-amber-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                            value={newDb.username}
                                            onChange={e => setNewDb({ ...newDb, username: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-amber-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                            value={newDb.password}
                                            onChange={e => setNewDb({ ...newDb, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex gap-4">
                                <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
                                    Database will be created with <span className="text-amber-900 border-b border-amber-300">utf8mb4</span> collation for global character support.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-amber-500 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-xl shadow-amber-100 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Provisioning...' : 'Initialize Instance'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabasesPage;
