import { useEffect, useState } from 'react';
import { User, Shield, Save, Cloud, Eye, EyeOff, AlertCircle, RefreshCw, Layers, Monitor, Activity, Zap, Info } from 'lucide-react';
import api from '../services/api';

const BentoCard = ({ children, className = '', span = '' }: any) => (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-neutral-200 flex flex-col justify-between hover:shadow-md transition-shadow ${span} ${className}`}>
        {children}
    </div>
);

const SettingsPage = () => {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [cfLoading, setCfLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [cfSaved, setCfSaved] = useState(false);

    const [cfCredentials, setCfCredentials] = useState({
        cf_api_token: '',
        cf_account_id: '',
    });

    useEffect(() => {
        api.get('/settings').then(res => {
            setSettings(res.data);
            setCfCredentials({
                cf_api_token: res.data.cf_api_token || '',
                cf_account_id: res.data.cf_account_id || '',
            });
            if (res.data.cf_api_token) setCfSaved(true);
        });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post('/settings', settings);
            alert('Settings saved successfully!');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCloudflare = async () => {
        if (!cfCredentials.cf_api_token || !cfCredentials.cf_account_id) {
            alert('Both API Token and Account ID are required.');
            return;
        }
        setCfLoading(true);
        try {
            await api.post('/settings', cfCredentials);
            setCfSaved(true);
            alert('Cloudflare credentials saved! DNS automation is now active.');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save Cloudflare credentials');
        } finally {
            setCfLoading(false);
        }
    };

    const handleReset = async () => {
        if (confirm('Are you sure you want to reset the database? This will clear all services and logs.')) {
            try {
                await api.post('/settings/reset');
                window.location.reload();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black text-black tracking-tight leading-none mb-2">System Governance</h1>
                    <p className="text-neutral-500 font-bold tracking-wide">Administrative Infrastructure Core</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-black hover:bg-neutral-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Synchronizing...' : 'Commit Changes'}
                </button>
            </div>

            {/* Core Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 auto-rows-[minmax(180px,auto)]">

                {/* 1. Admin Profile (Span 2) */}
                <BentoCard span="lg:col-span-2" className="text-center relative overflow-hidden group">
                    <div className="absolute -top-12 -left-12 w-48 h-48 bg-neutral-100/50 rounded-full blur-3xl" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-24 h-24 bg-white text-black rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-neutral-100 group-hover:scale-105 transition-transform duration-500">
                            <User size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Administrator</h3>
                        <div className="flex items-center justify-center gap-2 mt-3 mb-6">
                            <span className="px-3 py-1 bg-neutral-100 text-neutral-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Superuser</span>
                            <span className="px-3 py-1 bg-neutral-100 text-neutral-500 rounded-lg text-[9px] font-black uppercase tracking-widest">System Root</span>
                        </div>

                        <div className="mt-auto space-y-3 px-2">
                            <div className="flex items-center justify-between text-[11px] font-bold py-2 border-b border-neutral-100">
                                <span className="text-neutral-400">Governance Rank</span>
                                <span className="text-neutral-900">Master Console</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold py-2 border-b border-neutral-100">
                                <span className="text-neutral-400">Security Clearance</span>
                                <span className="text-black uppercase tracking-widest text-[10px] font-black">Unlimited</span>
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* 2. Interface Directives (Span 4) */}
                <BentoCard span="lg:col-span-4" className="relative">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1rem] bg-neutral-100 text-black flex items-center justify-center">
                                <Monitor size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-neutral-900 text-xl tracking-tight">Interface Directives</h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.1em] mt-1">Master UI & Network Identity</p>
                            </div>
                        </div>
                        <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
                            Node Identity
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                                Panel Display Name
                            </label>
                            <input
                                type="text"
                                value={settings?.panel_name || ''}
                                onChange={e => setSettings({ ...settings, panel_name: e.target.value })}
                                placeholder="Panzek Core"
                                className="w-full px-5 py-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-neutral-900 text-sm shadow-sm"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                                Core Build Version
                            </label>
                            <input
                                type="text"
                                value={settings?.version || '2.1.0'}
                                readOnly
                                className="w-full px-5 py-4 rounded-xl bg-neutral-50 border border-transparent text-neutral-400 font-mono text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                            Server Public Architecture (IP)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={settings?.server_public_ip || ''}
                                    onChange={e => setSettings({ ...settings, server_public_ip: e.target.value })}
                                    placeholder="123.45.67.89"
                                    className="w-full px-5 py-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono font-bold text-neutral-900 text-sm shadow-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const res = await fetch('https://api.ipify.org?format=json');
                                        const { ip } = await res.json();
                                        setSettings({ ...settings, server_public_ip: ip });
                                    } catch {
                                        alert('Gagal mendeteksi IP publik secara otomatis');
                                    }
                                }}
                                className="px-6 py-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                            >
                                <RefreshCw size={14} /> Detect IP
                            </button>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Info size={12} /> Primary pointer for automated A Records.
                        </p>
                    </div>
                </BentoCard>

                {/* 3. Security Clearance & Intel (Span 2) */}
                <BentoCard span="lg:col-span-2" className="bg-neutral-50">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-200 mb-6">
                        <Activity className="text-black" size={24} />
                    </div>
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-black text-neutral-900 tracking-tight">Security Clearance</h4>
                        </div>
                        <span className="inline-block px-3 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md mb-3">Level 10 Core</span>
                        <p className="text-neutral-500 text-xs font-medium leading-relaxed">
                            Accessing master configuration cluster. Modifications tracked via <code className="text-black font-bold">system.log</code>.
                        </p>
                    </div>

                    <div className="space-y-3 mt-auto">
                        <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-neutral-200 shadow-sm">
                            <Shield size={16} className="text-indigo-600" />
                            <div>
                                <p className="font-black text-neutral-900 text-xs">Encrypted Root</p>
                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">SHA-256 Verified</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-neutral-200 shadow-sm">
                            <Layers size={16} className="text-indigo-600" />
                            <div>
                                <p className="font-black text-neutral-900 text-xs">Active Pulse</p>
                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Real-time Sync</p>
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* 4. Cloudflare Gateway (Span 4) */}
                <BentoCard span="lg:col-span-4" className="!bg-indigo-600 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none transform group-hover:scale-110 transition-transform duration-1000">
                        <Cloud size={240} />
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row gap-10 h-full">
                        <div className="lg:w-1/3 flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-6 border border-white/20">
                                    <Cloud size={24} />
                                </div>
                                <h3 className="text-3xl font-black text-white leading-tight tracking-tight">Cloudflare Gateway</h3>
                                <p className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest mt-2">DNS Automation Engine</p>
                            </div>

                            <div className="mt-8">
                                {cfSaved ? (
                                    <div className="inline-flex items-center gap-2 bg-white/10 shadow-inner px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Live Connection</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md border border-black/10">
                                        <div className="w-2 h-2 rounded-full bg-neutral-400" />
                                        <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Offline Node</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:w-2/3 flex flex-col justify-between space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Master API Token</label>
                                    <div className="relative">
                                        <input
                                            type={showToken ? 'text' : 'password'}
                                            value={cfCredentials.cf_api_token}
                                            onChange={e => setCfCredentials({ ...cfCredentials, cf_api_token: e.target.value })}
                                            placeholder="eyJhbGciOiJSUzI1NiJ9..."
                                            className="w-full px-4 py-3 rounded-xl bg-indigo-700/50 border border-indigo-500/50 outline-none focus:border-white transition-all font-mono text-xs text-white placeholder-indigo-400"
                                        />
                                        <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white">
                                            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Account Architecture ID</label>
                                    <input
                                        type="text"
                                        value={cfCredentials.cf_account_id}
                                        onChange={e => setCfCredentials({ ...cfCredentials, cf_account_id: e.target.value })}
                                        placeholder="a1b2c3d4e5f6..."
                                        className="w-full px-4 py-3 rounded-xl bg-indigo-700/50 border border-indigo-500/50 outline-none focus:border-white transition-all font-mono text-xs text-white placeholder-indigo-400"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSaveCloudflare}
                                    disabled={cfLoading}
                                    className="w-full py-4 bg-white text-indigo-900 hover:bg-neutral-100 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {cfLoading ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                                    {cfLoading ? 'Activating Node...' : 'Synchronize Cloudflare'}
                                </button>
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* 5. Cloudflare Tunnel (Span 3) */}
                <BentoCard span="lg:col-span-3">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1rem] bg-black text-white flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-neutral-900 text-xl tracking-tight">Cloudflare Tunnel</h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.1em] mt-1">Encrypted Ingress Gateway</p>
                            </div>
                        </div>
                        {settings?.cf_tunnel_id ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                                <Zap size={10} fill="currentColor" /> Active
                            </span>
                        ) : (
                            <span className="px-3 py-1.5 bg-neutral-100 border border-neutral-200 text-neutral-400 rounded-lg text-[9px] font-black uppercase tracking-widest">Disconnected</span>
                        )}
                    </div>

                    <div className="space-y-6">
                        {settings?.cf_tunnel_id && (
                            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Tunnel Identifier</p>
                                <code className="text-sm font-mono text-black block truncate">{settings.cf_tunnel_id}</code>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                                Administrative Tunnel Token
                            </label>
                            <input
                                type="password"
                                value={settings?.cf_tunnel_token || ''}
                                onChange={e => setSettings({ ...settings, cf_tunnel_token: e.target.value })}
                                placeholder="Security token sequence..."
                                className="w-full px-5 py-4 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono text-xs text-neutral-700 shadow-sm"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    if (!confirm('System will initiate a remote tunnel recruit sequence. Proceed?')) return;
                                    setCfLoading(true);
                                    try {
                                        await api.post('/settings/cloudflare/tunnel');
                                        alert('Recruit successful! Node is now live.');
                                        window.location.reload();
                                    } catch (err: any) {
                                        alert('Recruit failed. Verify API permissions.');
                                    } finally {
                                        setCfLoading(false);
                                    }
                                }}
                                disabled={cfLoading}
                                className="flex-1 py-4 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                <Zap size={14} fill="currentColor" /> Recruit Tunnel
                            </button>
                            <button
                                onClick={async () => {
                                    setCfLoading(true);
                                    try {
                                        await api.post('/settings/cloudflare/tunnel/restart');
                                        alert('Process recycled successfully!');
                                    } catch (err: any) {
                                        alert('Process recycle failed.');
                                    } finally {
                                        setCfLoading(false);
                                    }
                                }}
                                disabled={cfLoading}
                                className="px-6 py-4 bg-white border border-neutral-200 text-neutral-700 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                            >
                                <RefreshCw size={14} className={cfLoading ? 'animate-spin' : ''} /> Recycle
                            </button>
                        </div>
                    </div>
                </BentoCard>

                {/* 6. Orchestrator Pulse (Span 3) */}
                <BentoCard span="lg:col-span-3" className="!bg-black text-white relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 opacity-[0.05] pointer-events-none">
                        <Activity size={180} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full">
                        <h4 className="text-lg font-black uppercase tracking-widest text-white mb-8">Orchestrator Pulse</h4>

                        <div className="space-y-6 mt-auto">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Core Latency</span>
                                <span className="text-white text-sm font-mono font-bold">0.04ms</span>
                            </div>
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Registry Sync</span>
                                <span className="text-white text-sm font-black text-green-400">Nominal</span>
                            </div>
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Security Layers</span>
                                <span className="text-white text-sm font-bold">Shield v2.0</span>
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* 7. Critical Overwrite (Span 6 - Full Width) */}
                <BentoCard span="lg:col-span-6" className="border-red-100 bg-red-50/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200">
                                <AlertCircle size={28} />
                            </div>
                            <div>
                                <h3 className="font-black text-red-600 text-2xl tracking-tight leading-none">Factory Registry Reset</h3>
                                <p className="text-neutral-500 text-sm font-medium tracking-wide mt-2 max-w-xl">
                                    Permanently purge the local database, clear all service registries, and return the panel to primitive zero-state.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="w-full md:w-auto px-8 py-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.1em] text-[10px] transition-all shadow-xl shadow-red-600/20 active:scale-95 whitespace-nowrap"
                        >
                            Execute Purge
                        </button>
                    </div>
                </BentoCard>

            </div>
        </div>
    );
};

export default SettingsPage;
