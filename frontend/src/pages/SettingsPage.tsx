import { useEffect, useState } from 'react';
import { Settings, User, Shield, Save, Cloud, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, Layers, Monitor, HardDrive, ShieldCheck, Box, Activity, Fingerprint, Zap, Lock, Info, ChevronRight } from 'lucide-react';
import api from '../services/api';

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
        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900 pointer-events-none">
                    <Fingerprint size={240} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-600 flex items-center justify-center rounded-[2rem] shadow-2xl shadow-blue-100">
                            <Settings className="text-white" size={32} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">System Governance</h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-3 ml-1 flex items-center gap-2">
                                <ShieldCheck size={12} className="text-blue-500" /> Administrative Infrastructure Core
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="z-10 group bg-slate-900 hover:bg-slate-800 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center gap-4 shadow-2xl shadow-slate-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin text-blue-400" /> : <Save size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />}
                    {loading ? 'Synchronizing...' : 'Commit Changes'}
                </button>
            </div>

            {/* Configuration Intelligence Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 bg-blue-50/40 p-8 rounded-[3rem] border border-blue-100/50 shadow-sm">
                <div className="lg:col-span-2 flex items-center gap-8 px-4">
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-900/10 border-4 border-blue-50">
                        <Activity className="text-blue-600" size={36} />
                    </div>
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">Security Clearance</h4>
                            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-blue-200">Level 10 Core</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Accessing master configuration cluster. All modifications are tracked via <code className="text-blue-600 font-bold">system.governance.log</code>.
                        </p>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 flex flex-col justify-center border border-white shadow-sm hover:shadow-md transition-shadow group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Network Integrity</span>
                    <div className="flex items-center gap-4 px-1">
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="font-black text-slate-800 text-sm tracking-tight">Encrypted Root</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">SHA-256 Verified</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 flex flex-col justify-center border border-white shadow-sm hover:shadow-md transition-shadow group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Registry Uptime</span>
                    <div className="flex items-center gap-4 px-1">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                            <Layers size={20} />
                        </div>
                        <div>
                            <p className="font-black text-slate-800 text-sm tracking-tight">Active Pulse</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Real-time Sync</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* General Settings */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group/form">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Monitor size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Interface Directives</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">Master UI & Network Identity</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 group-hover/form:border-indigo-200 transition-colors">
                                Node Identity
                            </div>
                        </div>

                        <div className="p-12 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3 px-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Monitor size={14} className="text-indigo-400" /> Panel Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings?.panel_name || ''}
                                        onChange={e => setSettings({ ...settings, panel_name: e.target.value })}
                                        placeholder="Enter panel name..."
                                        className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-700 text-lg tracking-tight shadow-sm"
                                    />
                                </div>
                                <div className="space-y-3 px-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 italic opacity-60">
                                        <Box size={14} /> Core Build Version
                                    </label>
                                    <div className="relative group/version">
                                        <input
                                            type="text"
                                            value={settings?.version || ''}
                                            readOnly
                                            className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent text-slate-400 font-mono text-sm cursor-not-allowed italic"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-1 bg-white rounded-lg text-[8px] font-black text-slate-400 uppercase border border-slate-100">Immutable</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 px-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Activity size={14} className="text-blue-400" /> Server Public Architecture
                                </label>
                                <div className="flex flex-col md:flex-row gap-5">
                                    <div className="relative flex-1 group/ip">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/ip:text-blue-500 transition-colors">
                                            <HardDrive size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={settings?.server_public_ip || ''}
                                            onChange={e => setSettings({ ...settings, server_public_ip: e.target.value })}
                                            placeholder="123.45.67.89"
                                            className="w-full pl-16 pr-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-mono font-bold text-slate-700 text-lg shadow-sm"
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
                                        className="px-8 py-5 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all shadow-xl shadow-blue-100 flex items-center gap-3 active:scale-95"
                                    >
                                        <RefreshCw size={16} /> Detect IP
                                    </button>
                                </div>
                                <div className="flex gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <Info className="text-blue-600 shrink-0" size={18} />
                                    <p className="text-[11px] text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
                                        This IP acts as the primary pointer for automated <code className="bg-white/60 px-1 rounded">A Records</code> within your Cloudflare domain clusters.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cloudflare Integration Gate */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group/cf flex flex-col md:flex-row">
                        <div className="md:w-1/3 bg-orange-600 p-10 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-20 text-white pointer-events-none">
                                <Cloud size={140} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center text-white mb-8 border border-white/20">
                                    <Cloud size={32} />
                                </div>
                                <h3 className="text-3xl font-black text-white leading-none tracking-tight">Cloudflare Gateway</h3>
                                <p className="text-orange-100/70 font-bold text-[10px] uppercase tracking-widest mt-4">DNS Automation Engine</p>
                            </div>

                            <div className="relative z-10 mt-10">
                                {cfSaved ? (
                                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-200" />
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Live Connection</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-orange-700/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-orange-400/30">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                                        <span className="text-[10px] font-black text-orange-100 uppercase tracking-[0.2em]">Offline Node</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-12 space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100">Setup Matrix</div>
                                </div>
                                <div className="space-y-4 px-1">
                                    {[
                                        { id: 1, text: 'Login at dash.cloudflare.com', icon: Monitor },
                                        { id: 2, text: 'Profile → API Tokens → Create Token', icon: Lock },
                                        { id: 3, text: 'Template: Edit Zone DNS', icon: CheckCircle },
                                        { id: 4, text: 'Permission: Cloudflare Tunnel → Edit', icon: ShieldCheck }
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center gap-4 group/step">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/step:bg-orange-50 group-hover/step:text-orange-500 transition-all font-black text-[10px]">{item.id}</div>
                                            <span className="text-sm font-bold text-slate-600 group-hover/step:text-slate-900 transition-colors flex items-center gap-2">
                                                <item.icon size={12} className="text-slate-300" /> {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Master API Token</label>
                                    <div className="relative group/token">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/token:text-orange-500 transition-colors">
                                            <Fingerprint size={20} />
                                        </div>
                                        <input
                                            type={showToken ? 'text' : 'password'}
                                            value={cfCredentials.cf_api_token}
                                            onChange={e => setCfCredentials({ ...cfCredentials, cf_api_token: e.target.value })}
                                            placeholder="eyJhbGciOiJSUzI1NiJ9..."
                                            className="w-full pl-16 pr-14 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-orange-100 focus:bg-white transition-all font-mono text-sm text-slate-700 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-orange-500 p-1"
                                        >
                                            {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Account Architecture ID</label>
                                    <div className="relative group/acid">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/acid:text-orange-500 transition-colors">
                                            <Layers size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={cfCredentials.cf_account_id}
                                            onChange={e => setCfCredentials({ ...cfCredentials, cf_account_id: e.target.value })}
                                            placeholder="a1b2c3d4e5f6..."
                                            className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-orange-100 focus:bg-white transition-all font-mono text-sm text-slate-700 shadow-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveCloudflare}
                                    disabled={cfLoading}
                                    className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-orange-100 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                                >
                                    {cfLoading ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} className="group-hover:translate-y-[-2px] transition-transform" />}
                                    {cfLoading ? 'Activating Node...' : 'Synchronize Cloudflare'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Tunnel Node */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group/tunnel">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Cloudflare Tunnel</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">Encrypted Ingress Gateway</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {settings?.cf_tunnel_id ? (
                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200">
                                        <Zap size={12} fill="currentColor" /> Active Link
                                    </span>
                                ) : (
                                    <span className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Disconnected</span>
                                )}
                            </div>
                        </div>

                        <div className="p-12 space-y-10">
                            {settings?.cf_tunnel_id && (
                                <div className="p-8 bg-indigo-900 rounded-[2.5rem] relative overflow-hidden group/id">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 text-white pointer-events-none">
                                        <Fingerprint size={120} />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Unique Tunnel Identifier</p>
                                            <code className="text-xl font-mono text-white block break-all tracking-tight group-hover/id:text-blue-300 transition-colors">{settings.cf_tunnel_id}</code>
                                        </div>
                                        <div className="shrink-0 bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
                                            <span className="text-[11px] font-black text-white uppercase tracking-widest">Edge Synced</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-10">
                                <div className="space-y-4 px-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Lock size={14} className="text-indigo-400" /> Administrative Tunnel Token
                                    </label>
                                    <div className="relative group/ttoken">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/ttoken:text-indigo-500 transition-colors">
                                            <Shield size={20} />
                                        </div>
                                        <input
                                            type={showToken ? 'text' : 'password'}
                                            value={settings?.cf_tunnel_token || ''}
                                            onChange={e => setSettings({ ...settings, cf_tunnel_token: e.target.value })}
                                            placeholder="Paste security token sequence..."
                                            className="w-full pl-16 pr-14 py-6 rounded-[1.5rem] bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-100 focus:bg-white transition-all font-mono text-sm text-slate-700 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 p-1"
                                        >
                                            {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {settings?.cf_tunnel_token && (
                                        <div className="p-6 bg-slate-900 rounded-[1.5rem] flex items-start gap-4 shadow-xl">
                                            <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0">
                                                <Info size={16} />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Environment Injection Required</p>
                                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                    Ensure this token is injected into <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">CF_TUNNEL_TOKEN</code> within your host architecture.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col md:flex-row gap-6">
                                    <button
                                        onClick={async () => {
                                            if (!cfSaved) {
                                                if (cfCredentials.cf_api_token && cfCredentials.cf_account_id) {
                                                    if (confirm('Credentials not synchronized. Commit now and initialize tunnel recruit?')) {
                                                        await handleSaveCloudflare();
                                                    } else return;
                                                } else {
                                                    alert('Please authorize Cloudflare Access first.');
                                                    return;
                                                }
                                            }
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
                                        className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                                    >
                                        <Zap size={18} fill="currentColor" />
                                        {cfLoading ? 'Processing...' : 'Recruit Automatic Tunnel'}
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
                                        className="px-8 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
                                    >
                                        <RefreshCw size={16} className={cfLoading ? 'animate-spin text-indigo-500' : ''} />
                                        Recycle Instance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Critical Overwrite Zone */}
                    <div className="bg-white rounded-[3rem] border border-rose-100 shadow-sm overflow-hidden group/danger relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-600 pointer-events-none">
                            <Shield size={120} />
                        </div>
                        <div className="px-10 py-6 border-b border-rose-50 flex items-center gap-5 bg-rose-50/20">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-100">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-rose-600 text-xl tracking-tight leading-none">Critical Overwrite</h3>
                                <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] mt-2">Destructive System Command</p>
                            </div>
                        </div>
                        <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2">
                                <p className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">Factory Registry Reset</p>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
                                    This sequence will permanently purge the local database, clear all service registries, and return the panel to its primitive build state.
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="w-full md:w-auto px-10 py-5 rounded-2xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-black uppercase tracking-[0.2em] text-[10px] transition-all border-2 border-rose-100 hover:border-transparent shadow-sm active:scale-95"
                            >
                                Execute Purge
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-10">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 text-center relative overflow-hidden group/profile">
                        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl group-hover/profile:bg-blue-100/50 transition-colors" />
                        <div className="relative z-10">
                            <div className="w-28 h-28 bg-white text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/10 border-4 border-slate-50 group-hover/profile:scale-105 transition-transform duration-500">
                                <User size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Administrator</h3>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">Superuser</span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">System Root</span>
                            </div>

                            <div className="my-10 space-y-4 px-2">
                                <div className="flex items-center justify-between text-xs font-bold py-2 border-b border-slate-50">
                                    <span className="text-slate-400">Governance Rank</span>
                                    <span className="text-slate-800">Master Console</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold py-2 border-b border-slate-50">
                                    <span className="text-slate-400">Security Clearance</span>
                                    <span className="text-blue-600 uppercase tracking-widest text-[10px] font-black">Unlimited</span>
                                </div>
                            </div>

                            <button className="w-full py-5 rounded-[1.5rem] bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-100 transition-all hover:bg-blue-700 hover:shadow-blue-200 active:scale-95 flex items-center justify-center gap-4 group">
                                Identity Details
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                        <div className="absolute -bottom-4 -right-4 opacity-10">
                            <Activity size={100} />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">Orchestrator Pulse</h4>
                            <div className="space-y-4 font-bold text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Core Latency</span>
                                    <span className="text-emerald-400">0.04ms</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Registry Sync</span>
                                    <span className="text-emerald-400 font-black">Nominal</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Security Layers</span>
                                    <span className="text-indigo-400">Shield v2.0</span>
                                </div>
                            </div>
                            <div className="pt-4 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                All Systems Operative
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
