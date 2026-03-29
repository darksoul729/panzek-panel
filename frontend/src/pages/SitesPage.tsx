import { useEffect, useState } from 'react';
import { Globe, Plus, Play, Square, RotateCw, Trash2, Server, Box, GitBranch, Network, ScrollText, X } from 'lucide-react';
import { sitesApi } from '../services/api';

const BentoCard = ({ children, className = '', span = '' }: any) => (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-neutral-200 flex flex-col justify-between hover:shadow-md transition-shadow ${span} ${className}`}>
        {children}
    </div>
);

const deriveDeployStage = (status: string, logs: string[]) => {
    const loweredStatus = status.toLowerCase();
    const joinedLogs = logs.join('\n').toLowerCase();

    if (loweredStatus === 'active' || loweredStatus === 'online') {
        return 'Deployment finished.';
    }

    if (loweredStatus === 'error' || logs.some((line) => line.startsWith('ERROR'))) {
        return 'Deployment failed. Check logs below.';
    }

    if (joinedLogs.includes('cloning branch') || joinedLogs.includes('git error')) {
        return 'Cloning repository...';
    }

    if (joinedLogs.includes('vendor missing') || joinedLogs.includes('composer install')) {
        return 'Installing PHP dependencies...';
    }

    if (joinedLogs.includes('running npm install')) {
        return 'Installing frontend dependencies...';
    }

    if (joinedLogs.includes('running npm run build')) {
        return 'Building frontend assets...';
    }

    if (joinedLogs.includes('docker compose') || joinedLogs.includes('stabilize') || joinedLogs.includes('started')) {
        return 'Starting container...';
    }

    if (joinedLogs.includes('generating artisan key')) {
        return 'Generating application key...';
    }

    if (joinedLogs.includes('running migrations')) {
        return 'Running database migrations...';
    }

    if (joinedLogs.includes('fixing symlinks') || joinedLogs.includes('storage:link')) {
        return 'Preparing storage links...';
    }

    if (loweredStatus === 'deploying') {
        return 'Preparing deployment...';
    }

    return 'Cloning repository and preparing container...';
};

const SitesPage = () => {
    const [sites, setSites] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [controllingId, setControllingId] = useState<number | string | null>(null);
    const [showLogs, setShowLogs] = useState<any>(null);
    const [logContent, setLogContent] = useState<string[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [creatingSite, setCreatingSite] = useState(false);
    const [deployingSite, setDeployingSite] = useState<any>(null);
    const [deployProgress, setDeployProgress] = useState<string[]>([]);
    const [deployStatus, setDeployStatus] = useState('Preparing deployment...');

    const fetchLogs = async (id: number) => {
        setLoadingLogs(true);
        try {
            const res = await sitesApi.logs(id);
            setLogContent(res.data.logs || []);
        } catch (err) {
            setLogContent(["Error loading logs from backend."]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchSites = async () => {
        try {
            const res = await sitesApi.list();
            if (res?.data) setSites(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch sites', err);
        }
    };

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        if (!deployingSite?.id) return;

        let cancelled = false;
        const siteId = deployingSite.id;

        const pollProgress = async () => {
            try {
                const [sitesRes, logsRes] = await Promise.all([
                    sitesApi.list(),
                    sitesApi.logs(siteId),
                ]);

                if (cancelled) return;

                const siteList = Array.isArray(sitesRes?.data) ? sitesRes.data : [];
                const currentSite = siteList.find((entry: any) => (entry?.id || entry?.ID) === siteId);
                const nextLogs = logsRes?.data?.logs || [];

                setDeployProgress(nextLogs);

                const loweredStatus = String(currentSite?.status || '').toLowerCase();
                const nextStage = deriveDeployStage(loweredStatus, nextLogs);
                if (loweredStatus === 'active' || loweredStatus === 'online') {
                    setDeployStatus(nextStage);
                    setShowAdd(false);
                    setCreatingSite(false);
                    setDeployingSite(null);
                    fetchSites();
                    return;
                }

                if (loweredStatus === 'error' || nextLogs.some((line: string) => line.startsWith('ERROR'))) {
                    setDeployStatus(nextStage);
                    setCreatingSite(false);
                    return;
                }

                setDeployStatus(nextStage);
            } catch (err) {
                if (!cancelled) {
                    setDeployStatus('Still provisioning deployment...');
                }
            }
        };

        pollProgress();
        const timer = window.setInterval(pollProgress, 2500);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [deployingSite]);

    const [newSite, setNewSite] = useState({
        domain: '',
        type: 'static',
        php_version: '8.3',
        git_url: '',
        branch: 'main',
        db_name: '',
        db_user: '',
        db_password: ''
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingSite(true);
        setDeployProgress([]);
        setDeployStatus('Creating site record...');
        try {
            // 1. Create DB record
            const res = await sitesApi.create(newSite);
            const createdSite = res.data;

            // 2. Trigger async deployment provision
            if (createdSite && (createdSite.id || createdSite.ID)) {
                const nextSite = {
                    id: createdSite.id || createdSite.ID,
                    domain: createdSite.domain || newSite.domain,
                };
                setDeployingSite(nextSite);
                setDeployStatus('Queued deployment job...');
                await sitesApi.deploy(createdSite.id || createdSite.ID);
            }
        } catch (err: any) {
            console.error(err);
            setCreatingSite(false);
            setDeployingSite(null);
            alert(err.response?.data?.error || 'Failed to initialize site deployment architecture.');
        }
    };

    const closeDeployModal = () => {
        if (creatingSite) return;
        setDeployingSite(null);
        setDeployProgress([]);
        setDeployStatus('Preparing deployment...');
    };

    const handleAction = async (action: 'start' | 'stop' | 'restart', id: number) => {
        if (!id) {
            alert('Error: Site ID is missing');
            return;
        }
        setControllingId(id);
        try {
            await sitesApi.control(id, action);
            await fetchSites();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || `Failed to ${action} site. Ensure backend services are running properly.`);
        } finally {
            setControllingId(null);
        }
    };

    const handleDelete = async (id: number, domain: string) => {
        if (!id) {
            alert('Error: Site ID is missing');
            return;
        }
        if (!confirm(`Delete configuration and container for ${domain}? This cannot be undone.`)) return;
        setControllingId(id);
        try {
            await sitesApi.delete(id);
            await fetchSites();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || `Failed to delete site configuration. Check docker privileges.`);
        } finally {
            setControllingId(null);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black text-black tracking-tight leading-none mb-2">Web Deployments</h1>
                    <p className="text-neutral-500 font-bold tracking-wide">Manage routing, proxies, and application spaces.</p>
                </div>

                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95 group uppercase tracking-widest text-[11px]"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Deployment
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
                {Array.isArray(sites) && sites.map((site) => (
                    <BentoCard key={site?.id || site?.ID || site?.domain} span="col-span-1" className="group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-200 text-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors relative z-10">
                                <Globe size={24} />
                            </div>

                            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative z-10 shadow-sm ${site?.status?.toLowerCase() === 'active' || site?.status?.toLowerCase() === 'online'
                                ? 'bg-black border-black text-white'
                                : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${site?.status?.toLowerCase() === 'active' || site?.status?.toLowerCase() === 'online' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-neutral-400'}`} />
                                {site?.status || 'Unknown'}
                            </div>
                        </div>

                        <div className="relative z-10">
                            <a href={`https://${site?.domain}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors block">
                                <h3 className="text-2xl font-black text-black tracking-tight mb-1 truncate" title={site?.domain}>{site?.domain || 'Unknown Domain'}</h3>
                            </a>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="bg-neutral-100 text-neutral-600 px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1.5 border border-neutral-200">
                                    <Box size={12} /> {site?.type?.toUpperCase() || 'STATIC'}
                                </span>
                                {site?.php_version && (
                                    <span className="bg-neutral-100 text-neutral-600 px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1.5 border border-neutral-200">
                                        <Server size={12} /> PHP {site?.php_version}
                                    </span>
                                )}
                                {site?.ip && (
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1.5 border border-indigo-100" title="Internal Container IP">
                                        <Network size={12} /> {site.ip}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleAction('start', site?.id || site?.ID)} disabled={controllingId === (site?.id || site?.ID)} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-black hover:text-white text-neutral-600 border border-neutral-200 transition-all shadow-sm disabled:opacity-50" title="Start">
                                    {(controllingId === (site?.id || site?.ID)) ? <RotateCw size={16} className="animate-spin text-indigo-500" /> : <Play size={16} className="fill-current" />}
                                </button>
                                <button onClick={() => handleAction('restart', site?.id || site?.ID)} disabled={controllingId === (site?.id || site?.ID)} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-black hover:text-white text-neutral-600 border border-neutral-200 transition-all shadow-sm disabled:opacity-50" title="Restart">
                                    <RotateCw size={16} className={controllingId === (site?.id || site?.ID) ? "animate-spin text-indigo-500" : ""} />
                                </button>
                                <button onClick={() => handleAction('stop', site?.id || site?.ID)} disabled={controllingId === (site?.id || site?.ID)} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-black hover:text-white text-neutral-600 border border-neutral-200 transition-all shadow-sm disabled:opacity-50" title="Stop">
                                    <Square size={16} />
                                </button>
                            </div>

                            <button onClick={() => { setShowLogs(site); fetchLogs(site.id || site.ID); }} className="p-2.5 rounded-xl bg-neutral-50 hover:bg-black hover:text-white text-neutral-600 border border-neutral-200 transition-all shadow-sm" title="View Logs">
                                <ScrollText size={16} />
                            </button>
                            <button onClick={() => handleDelete(site?.id || site?.ID, site?.domain)} disabled={controllingId === (site?.id || site?.ID)} className="p-2.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-500 border border-red-100 transition-all shadow-sm group-hover:opacity-100 disabled:opacity-50" title="Delete Deployment">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </BentoCard>
                ))}

                {(!sites || sites.length === 0) && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 bg-white rounded-[2rem] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-neutral-50 text-neutral-300 rounded-3xl mb-6 flex items-center justify-center">
                            <Globe size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-black tracking-tight mb-2">No Deployments Configured</h3>
                        <p className="text-neutral-500 font-bold max-w-sm">Press "New Deployment" to route a domain and allocate a site container.</p>
                    </div>
                )}
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="absolute -top-10 -right-10 opacity-[0.03] text-neutral-900 pointer-events-none">
                            <Globe size={200} />
                        </div>

                        <div className="flex-none mb-6 relative z-10 flex justify-between items-center">
                            <h3 className="text-3xl font-black text-black tracking-tight">Create Routing</h3>
                            <button onClick={() => setShowAdd(false)} className="w-10 h-10 bg-neutral-50 hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors">
                                <Plus size={20} className="rotate-45 text-neutral-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 relative z-10">
                            <form onSubmit={handleCreate} className="space-y-6 pb-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Configuration Type</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 font-bold text-black focus:bg-white focus:border-indigo-600 outline-none appearance-none rounded-2xl transition-shadow shadow-sm"
                                                value={newSite.type}
                                                onChange={e => setNewSite({ ...newSite, type: e.target.value })}
                                            >
                                                <option value="static">Static HTML</option>
                                                <option value="php">Native PHP</option>
                                                <option value="laravel">Laravel Framework</option>
                                                <option value="proxy">Reverse Proxy</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                                <Box size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Canonical Domain</label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 font-bold text-black focus:bg-white focus:border-indigo-600 outline-none rounded-2xl transition-shadow shadow-sm pl-12"
                                                placeholder="project.domain.com"
                                                value={newSite.domain}
                                                onChange={e => setNewSite({ ...newSite, domain: e.target.value })}
                                            />
                                            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Repository Source (SSH or HTTPS)</label>
                                    <div className="relative">
                                        <input
                                            required
                                            className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 font-mono text-sm text-black focus:bg-white focus:border-indigo-600 outline-none rounded-2xl transition-shadow shadow-sm pl-12"
                                            placeholder="git@github.com:user/project.git"
                                            value={newSite.git_url}
                                            onChange={e => setNewSite({ ...newSite, git_url: e.target.value })}
                                        />
                                        <GitBranch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Target Branch</label>
                                        <input
                                            required
                                            className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 font-bold text-black focus:bg-white focus:border-indigo-600 outline-none rounded-2xl transition-shadow shadow-sm"
                                            placeholder="main"
                                            value={newSite.branch}
                                            onChange={e => setNewSite({ ...newSite, branch: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">PHP Engine Version</label>
                                        <select
                                            className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 font-bold text-black focus:bg-white focus:border-indigo-600 outline-none appearance-none rounded-2xl transition-shadow shadow-sm"
                                            value={newSite.php_version}
                                            onChange={e => setNewSite({ ...newSite, php_version: e.target.value })}
                                        >
                                            <option value="8.3">PHP 8.3 (Latest)</option>
                                            <option value="8.2">PHP 8.2</option>
                                            <option value="8.1">PHP 8.1</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-neutral-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Database Provisioning (Optional)</label>
                                    <p className="text-[10px] font-bold text-neutral-400 ml-1 mt-1 mb-4">Automatically allocate an isolated database and user credentials for this application.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <input
                                            placeholder="DB Name"
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 font-bold text-black text-sm focus:bg-white focus:border-indigo-600 outline-none rounded-xl transition-shadow shadow-sm"
                                            value={newSite.db_name}
                                            onChange={e => setNewSite({ ...newSite, db_name: e.target.value })}
                                        />
                                        <input
                                            placeholder="DB User"
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 font-bold text-black text-sm focus:bg-white focus:border-indigo-600 outline-none rounded-xl transition-shadow shadow-sm"
                                            value={newSite.db_user}
                                            onChange={e => setNewSite({ ...newSite, db_user: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="DB Pass"
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 font-bold text-black text-sm focus:bg-white focus:border-indigo-600 outline-none rounded-xl transition-shadow shadow-sm"
                                            value={newSite.db_password}
                                            onChange={e => setNewSite({ ...newSite, db_password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-4">
                                    <button type="button" onClick={() => setShowAdd(false)} disabled={creatingSite} className="w-full sm:w-1/3 px-6 py-5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-black uppercase tracking-widest text-xs transition-colors shadow-sm disabled:opacity-50">Cancel</button>
                                    <button type="submit" disabled={creatingSite} className="flex-1 px-6 py-5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-widest text-xs shadow-xl transition-transform active:scale-95 flex justify-center items-center gap-3 disabled:opacity-70">
                                        {creatingSite ? <RotateCw size={18} className="animate-spin" /> : <Globe size={18} />}
                                        {creatingSite ? 'Deploying...' : 'Initialize Deployment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {deployingSite && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-black tracking-tight">Deployment Progress</h3>
                                <p className="text-neutral-500 font-bold text-sm mt-1">{deployingSite.domain}</p>
                            </div>
                            <button onClick={closeDeployModal} disabled={creatingSite} className="w-10 h-10 bg-neutral-50 hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors disabled:opacity-50">
                                <X size={20} className="text-neutral-500" />
                            </button>
                        </div>
                        <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                            <div className="flex items-center gap-3 text-sm font-bold text-neutral-700">
                                <RotateCw size={16} className={creatingSite ? 'animate-spin text-indigo-500' : 'text-green-600'} />
                                {deployStatus}
                            </div>
                        </div>
                        <div className="bg-black rounded-2xl p-6 overflow-y-auto flex-1 font-mono text-xs text-neutral-300 leading-relaxed shadow-inner min-h-[320px]">
                            {deployProgress.length > 0 ? (
                                deployProgress.map((line, i) => (
                                    <div key={i} className={line.startsWith('ERROR') ? 'text-red-400 font-bold' : line.startsWith('OK') ? 'text-green-400' : line.startsWith('---') ? 'text-indigo-400 mt-4 font-black' : ''}>
                                        {line}
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <RotateCw size={14} className="animate-spin" />
                                    Waiting for git clone and deployment logs...
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={closeDeployModal} disabled={creatingSite} className="px-8 py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-50">
                                {creatingSite ? 'Deploying...' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showLogs && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-3xl font-black text-black">Site Diagnostics & Logs</h3>
                            <button onClick={() => setShowLogs(null)} className="w-10 h-10 bg-neutral-50 hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors">
                                <X size={20} className="text-neutral-500" />
                            </button>
                        </div>
                        <div className="bg-black rounded-2xl p-6 overflow-y-auto flex-1 font-mono text-xs text-neutral-300 leading-relaxed shadow-inner">
                            {loadingLogs ? (
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <RotateCw size={14} className="animate-spin" />
                                    Querying real-time container metrics...
                                </div>
                            ) : logContent.length > 0 ? (
                                logContent.map((line, i) => (
                                    <div key={i} className={line.startsWith("ERROR") ? "text-red-400 font-bold" : line.startsWith("OK") ? "text-green-400" : line.startsWith("---") ? "text-indigo-400 mt-4 font-black" : ""}>
                                        {line}
                                    </div>
                                ))
                            ) : (
                                "No runtime data available for this site node."
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowLogs(null)} className="px-8 py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitesPage;
