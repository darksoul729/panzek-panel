import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, Play, GitBranch, AlertTriangle, X, Monitor, Link, FileText, RefreshCw, Server, ShieldCheck, Zap, ArrowUpRight, Layers, Loader2, Activity, Terminal, Square, ExternalLink } from 'lucide-react';
import { sitesApi } from '../services/api';
import api from '../services/api';

const SitesPage = () => {
    const [sites, setSites] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [controllingId, setControllingId] = useState<number | string | null>(null);
    const [newSite, setNewSite] = useState({
        domain: '',
        type: 'laravel',
        repo_url: '',
        branch: 'main',
        db_name: '',
        db_user: '',
        db_password: ''
    });

    // Logs states
    const [selectedSite, setSelectedSite] = useState<any>(null);
    const [logs, setLogs] = useState<string>('');
    const [fetchingLogs, setFetchingLogs] = useState(false);

    const fetchSites = async () => {
        try {
            const { data } = await sitesApi.list();
            setSites(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSites();
        const interval = setInterval(fetchSites, 10000); // Auto refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sitesApi.create(newSite);
            setShowAdd(false);
            fetchSites();
        } catch (err) {
            alert('Deployment failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Are you sure you want to delete this site?')) return;
        try {
            await sitesApi.delete(id as number);
            fetchSites();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleControl = async (id: number | string, action: string) => {
        setControllingId(id);
        try {
            await (sitesApi as any).control(id, action);
            await fetchSites();
        } catch (err) {
            alert(`Failed to ${action} site`);
        } finally {
            setControllingId(null);
        }
    };

    const fetchLogs = async (site: any) => {
        setFetchingLogs(true);
        setSelectedSite(site);
        setLogs('Loading logs from container...');
        try {
            const siteId = site.id ?? site.ID;
            const { data } = await api.get(`/sites/${siteId}/logs`);
            setLogs(Array.isArray(data.logs) ? data.logs.join('\n') : (data.logs || 'No logs found.'));
        } catch (err) {
            setLogs('Failed to fetch logs. Is the container running?');
        } finally {
            setFetchingLogs(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': case 'online': return 'bg-emerald-500';
            case 'deploying': return 'bg-blue-500 animate-pulse';
            case 'error': return 'bg-rose-500';
            case 'offline': case 'stopped': return 'bg-slate-300';
            default: return 'bg-slate-300';
        }
    };

    const getTypeBadgeClass = (type: string) => {
        switch (type.toLowerCase()) {
            case 'laravel': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'php': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'static': return 'bg-teal-50 text-teal-600 border-teal-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900 pointer-events-none">
                    <Globe size={200} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-200">
                            <Monitor className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-none">Web Architecture</h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 ml-0.5">Automated Deployment Hub</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowAdd(true)}
                    className="z-10 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-blue-100 transition-all hover:-translate-y-0.5 active:scale-95 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Deployment
                </button>
            </div>

            {/* Network Intelligence Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 shadow-sm shadow-blue-50">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl shadow-blue-100">
                        <ShieldCheck className="text-white" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-slate-900">Cloudflare Tunnel</h4>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-tight">
                            Automatic CNAME routing and global CDN are enabled for all public domains.
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Access Method</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                            <Zap size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">Direct Tunnelling</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Local Proxy</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <Layers size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-sm tracking-tight">Traefik Edging</p>
                    </div>
                </div>
            </div>

            {/* Sites Performance Grid */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 px-10 py-6 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/20">
                    <div className="col-span-4">Service Domain</div>
                    <div className="col-span-2">Environment</div>
                    <div className="col-span-2">Network IP</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3 text-right">Command Center</div>
                </div>

                <div className="divide-y divide-slate-50">
                    {sites.map((site) => {
                        const siteId = site.id ?? site.ID;
                        return (
                            <div key={siteId} className="grid grid-cols-12 px-10 py-8 items-center hover:bg-slate-50/30 transition-all duration-300 group">
                                <div className="col-span-4 flex items-center gap-5 mr-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm relative">
                                        <Globe size={22} />
                                        {controllingId === siteId && (
                                            <div className="absolute inset-0 bg-blue-600/10 rounded-2xl flex items-center justify-center">
                                                <Loader2 size={16} className="animate-spin text-blue-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-800 text-lg leading-tight truncate">{site.domain}</span>
                                            <a href={`http://${site.domain}`} target="_blank" className="text-slate-300 hover:text-blue-600 transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Live Endpoint</span>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getTypeBadgeClass(site.type)}`}>
                                        {site.type}
                                    </span>
                                </div>

                                <div className="col-span-2 font-mono text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <Server size={12} className="text-slate-300" />
                                    {site.ip || '---'}
                                </div>

                                <div className="col-span-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${getStatusColor(site.status)}`} />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{site.status}</span>
                                    </div>
                                </div>

                                <div className="col-span-3 flex justify-end gap-3">
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all">
                                        <button
                                            onClick={() => fetchLogs(site)}
                                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                            title="System Logs"
                                        >
                                            <FileText size={18} />
                                        </button>

                                        {site.status === 'offline' ? (
                                            <button
                                                onClick={() => handleControl(siteId, 'start')}
                                                disabled={controllingId === siteId}
                                                className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all active:scale-90"
                                                title="Start Service"
                                            >
                                                <Play size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleControl(siteId, 'stop')}
                                                disabled={controllingId === siteId}
                                                className="p-3 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all active:scale-90"
                                                title="Stop Service"
                                            >
                                                <Square size={18} />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleControl(siteId, 'restart')}
                                            disabled={controllingId === siteId}
                                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                            title="Restart Site"
                                        >
                                            <RefreshCw size={18} className={controllingId === siteId ? 'animate-spin' : ''} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(siteId)}
                                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                            title="Terminate Deployment"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {sites.length === 0 && (
                        <div className="p-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                <Play size={40} className="ml-1" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">No Active Deployments</h4>
                            <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed px-10 italic">
                                Your network is idle. Click the button above to provision your first web architecture.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Deployment Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <GitBranch size={100} />
                        </div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">New Deployment</h3>
                                <p className="text-slate-400 font-medium text-sm mt-3 flex items-center gap-2">
                                    <ArrowUpRight size={14} className="text-blue-500" /> System provisioning sequence
                                </p>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleDeploy} className="space-y-8 relative z-10">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Stack Type</label>
                                    <select
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-black text-slate-600 text-sm appearance-none"
                                        value={newSite.type}
                                        onChange={e => setNewSite({ ...newSite, type: e.target.value })}
                                    >
                                        <option value="laravel">Laravel Framework</option>
                                        <option value="php">Native PHP</option>
                                        <option value="static">Static HTML</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Network Visibility</label>
                                    <div className="w-full px-6 py-4 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center gap-2 border border-emerald-100">
                                        <ShieldCheck size={14} /> PUBLIC ACCESS
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Domain Identity</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Globe size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="project.yourdomain.com"
                                        className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                        value={newSite.domain}
                                        onChange={e => setNewSite({ ...newSite, domain: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2 ml-1 text-slate-400">
                                    <AlertTriangle size={12} className="text-amber-500" />
                                    <p className="text-[9px] font-bold uppercase tracking-wider">Automated CNAME creation will follow deployment.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Repository Source (SSH or HTTPS)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="git@github.com:user/project.git"
                                    className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-mono text-sm font-bold text-slate-600"
                                    value={newSite.repo_url}
                                    onChange={e => setNewSite({ ...newSite, repo_url: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Database Configuration (Optional)</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="DB Name"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 text-xs"
                                            value={newSite.db_name}
                                            onChange={e => setNewSite({ ...newSite, db_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="DB User"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 text-xs"
                                            value={newSite.db_user}
                                            onChange={e => setNewSite({ ...newSite, db_user: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            type="password"
                                            placeholder="DB Pass"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 text-xs"
                                            value={newSite.db_password}
                                            onChange={e => setNewSite({ ...newSite, db_password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pb-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Target Branch</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="main"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 text-sm"
                                        value={newSite.branch}
                                        onChange={e => setNewSite({ ...newSite, branch: e.target.value })}
                                    />
                                </div>
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Propagating...' : 'Trigger Deploy'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {selectedSite && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100">
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-blue-400 shadow-2xl shadow-blue-900/20">
                                    <Terminal size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-3">
                                        Container Logs
                                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Live Output</span>
                                    </h3>
                                    <p className="text-slate-400 font-medium text-sm mt-2 flex items-center gap-2">
                                        <Link size={14} className="text-slate-300" /> {selectedSite.domain}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => fetchLogs(selectedSite)}
                                    disabled={fetchingLogs}
                                    className="px-6 py-3 whitespace-nowrap bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <RefreshCw size={14} className={fetchingLogs ? 'animate-spin' : ''} />
                                    {fetchingLogs ? 'Streaming...' : 'Refresh Logs'}
                                </button>
                                <button
                                    onClick={() => setSelectedSite(null)}
                                    className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-2xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Logs Content */}
                        <div className="flex-1 overflow-auto bg-[#0f172a] p-10 font-mono text-sm leading-relaxed relative group/logs">
                            <div className="absolute top-6 left-6 opacity-10 text-white pointer-events-none group-hover/logs:opacity-20 transition-opacity">
                                <Activity size={80} />
                            </div>

                            {fetchingLogs && logs === 'Loading logs from container...' ? (
                                <div className="h-full flex items-center justify-center flex-col gap-4">
                                    <Loader2 className="animate-spin text-blue-400" size={32} />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Terminal Stream...</p>
                                </div>
                            ) : (
                                <pre className="text-slate-300 whitespace-pre-wrap relative z-10">
                                    {logs.split('\n').map((line, i) => (
                                        <div key={i} className="flex gap-6 hover:bg-white/5 px-4 rounded-lg transition-colors">
                                            <span className="text-slate-600 select-none w-8 shrink-0 text-right">{i + 1}</span>
                                            <span className={line.toLowerCase().includes('error') ? 'text-rose-400' : line.toLowerCase().includes('warn') ? 'text-amber-300' : ''}>
                                                {line}
                                            </span>
                                        </div>
                                    ))}
                                </pre>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health: Operational</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Router: Traefik L7</span>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Output limit: 100 lines
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitesPage;
