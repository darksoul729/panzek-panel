import { useEffect, useState } from 'react';
import { Folder, FileText, ChevronLeft, Search, HardDrive, Trash2, FolderPlus, ExternalLink, GitBranch, X, Loader2, Edit3, Download, Terminal as TerminalIcon, ChevronRight, LayoutGrid, Box, Activity, Database, RefreshCw, Layers } from 'lucide-react';
import api from '../services/api';
import Terminal from '../components/Terminal';

const FilesPage = () => {
    const [items, setItems] = useState<any[]>([]);
    const [path, setPath] = useState('.');
    const [search, setSearch] = useState('');
    const [showClone, setShowClone] = useState(false);
    const [cloning, setCloning] = useState(false);
    const [cloneForm, setCloneForm] = useState({ url: '', branch: '' });

    // Editor States
    const [editingFile, setEditingFile] = useState<any>(null);
    const [fileContent, setFileContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Terminal Modal States
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalModalPath, setTerminalModalPath] = useState('');

    // Context Menu States
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any } | null>(null);

    const fetchFiles = async (newPath: string) => {
        try {
            const { data } = await api.get(`/files/list?path=${encodeURIComponent(newPath)}`);
            setItems(data || []);
            setPath(newPath);
            setContextMenu(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item
        });
    };

    const handleRename = async (item: any) => {
        const newName = prompt('Enter new name:', item.name);
        if (newName && newName !== item.name) {
            try {
                await api.post('/files/rename', {
                    old_path: item.path,
                    new_name: newName
                });
                fetchFiles(path);
            } catch (err) {
                alert('Rename failed');
            }
        }
        setContextMenu(null);
    };

    const handleDownload = (item: any) => {
        if (item.is_dir) return;
        window.open(`${api.defaults.baseURL}/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
        setContextMenu(null);
    };

    const openInTerminal = (item: any) => {
        const targetPath = item.is_dir ? item.path : path;
        setTerminalModalPath('/var/www/' + targetPath);
        setShowTerminal(true);
        setContextMenu(null);
    };

    const handleOpenFile = async (item: any) => {
        try {
            const { data } = await api.get(`/files/read?path=${encodeURIComponent(item.path)}`);
            setEditingFile(item);
            setFileContent(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        } catch (err) {
            alert('Failed to read file');
        }
    };

    const handleSaveFile = async () => {
        if (!editingFile) return;
        setSaving(true);
        try {
            await api.post('/files/save', {
                path: editingFile.path,
                content: fileContent
            });
            setEditingFile(null);
        } catch (err) {
            alert('Save failed');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchFiles('.');

        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDelete = async (itemPath: string) => {
        if (confirm(`Delete ${itemPath}?`)) {
            try {
                await api.delete(`/files?path=${encodeURIComponent(itemPath)}`);
                fetchFiles(path);
            } catch (err) {
                alert('Delete failed');
            }
        }
    };

    const handleMkdir = async () => {
        const name = prompt('New folder name:');
        if (name) {
            try {
                await api.post('/files/mkdir', { path, name });
                fetchFiles(path);
            } catch (err) {
                alert('Failed to create folder');
            }
        }
    };

    const handleClone = async (e: React.FormEvent) => {
        e.preventDefault();
        setCloning(true);
        try {
            await api.post('/git/clone', {
                repo_url: cloneForm.url,
                branch: cloneForm.branch,
                path: path === '.' ? '/var/www/' + cloneForm.url.split('/').pop()?.replace('.git', '') : path + '/' + cloneForm.url.split('/').pop()?.replace('.git', '')
            });
            setShowClone(false);
            setCloneForm({ url: '', branch: '' });
            fetchFiles(path);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Clone failed');
        } finally {
            setCloning(false);
        }
    };

    const goBack = () => {
        if (path === '.') return;
        const parts = path.split('/');
        parts.pop();
        fetchFiles(parts.join('/') || '.');
    };

    const breadcrumbs = path === '.' ? ['root'] : ['root', ...path.split('/')];

    const navigateToBreadcrumb = (index: number) => {
        if (index === 0) {
            fetchFiles('.');
        } else {
            const parts = path.split('/');
            fetchFiles(parts.slice(0, index).join('/'));
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const dirStats = {
        folders: items.filter(i => i.is_dir).length,
        files: items.filter(i => !i.is_dir).length,
        totalSize: items.reduce((acc, i) => acc + (i.size || 0), 0)
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 flex flex-col h-full" onContextMenu={(e) => e.preventDefault()}>
            {/* Page Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900 pointer-events-none">
                    <Box size={200} />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={goBack}
                            disabled={path === '.'}
                            className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100/50 disabled:opacity-30 active:scale-90"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-slate-900 leading-none">Virtual File System</h2>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">Live Browser</span>
                            </div>
                            <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar max-w-2xl">
                                {breadcrumbs.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 shrink-0">
                                        {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                                        <button
                                            onClick={() => navigateToBreadcrumb(i)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === breadcrumbs.length - 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {b}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Scan directory..."
                                className="w-64 pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-blue-100 focus:bg-white transition-all font-bold text-slate-700 text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowClone(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-emerald-100 transition-all hover:-translate-y-0.5 active:scale-95 group"
                        >
                            <GitBranch size={20} className="group-hover:rotate-12 transition-transform" />
                            Clone
                        </button>
                    </div>
                </div>
            </div>

            {/* Storage Intelligence Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 shadow-sm shadow-blue-50">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl shadow-blue-100">
                        <HardDrive className="text-white" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-slate-900">Virtual Root</h4>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Mounted</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-tight">
                            Accessing localized system volume at <code className="bg-white/50 px-1.5 rounded text-blue-600 font-bold">/var/www</code>.
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Directory Stats</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                            <LayoutGrid size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-[11px] tracking-tight">{dirStats.folders} Folders • {dirStats.files} Files</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Node Activity</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                            <Activity size={16} />
                        </div>
                        <p className="font-black text-slate-700 text-[11px] tracking-tight">Active Indexing</p>
                    </div>
                </div>
            </div>

            {/* Files Grid List */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 px-10 py-6 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/20">
                    <div className="col-span-6">Name / Identifier</div>
                    <div className="col-span-2">Payload Size</div>
                    <div className="col-span-3">Object Type</div>
                    <div className="col-span-1 text-right">
                        <button onClick={handleMkdir} className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-blue-500 hover:border-blue-200 transition-all active:scale-90 shadow-sm" title="New Folder">
                            <FolderPlus size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 min-h-[400px]">
                    {filteredItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-12 px-10 py-5 hover:bg-slate-50/50 transition-all duration-300 group items-center relative overflow-hidden"
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div
                                className="col-span-6 flex items-center gap-5 cursor-pointer min-w-0"
                                onClick={() => item.is_dir ? fetchFiles(item.path) : handleOpenFile(item)}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${item.is_dir ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white shadow-sm' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-600 shadow-sm border border-transparent group-hover:border-slate-100'}`}>
                                    {item.is_dir ? <Folder size={22} fill="currentColor" fillOpacity={0.2} /> : <FileText size={22} />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-slate-800 text-lg leading-tight truncate tracking-tight">{item.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400 truncate mt-1">{item.path}</span>
                                </div>
                            </div>

                            <div className="col-span-2 text-xs font-bold text-slate-400 flex items-center gap-2">
                                <Database size={12} className="text-slate-200" />
                                {item.is_dir ? '--' : (item.size / 1024).toFixed(1) + ' KB'}
                            </div>

                            <div className="col-span-3">
                                <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${item.is_dir ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                    {item.is_dir ? 'Folder Node' : item.name.split('.').pop()?.toUpperCase() + ' Binary'}
                                </span>
                            </div>

                            <div className="col-span-1">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                    <button
                                        onClick={() => handleDelete(item.path)}
                                        className="p-3 text-slate-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-xl active:scale-90"
                                        title="Delete Object"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        className="p-3 text-slate-300 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-xl active:scale-90"
                                        onClick={() => item.is_dir ? fetchFiles(item.path) : handleOpenFile(item)}
                                        title="Open / Edit"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-32 bg-slate-50/20">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-sm mb-6">
                                <Search size={40} />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">No Matches Found</h4>
                            <p className="text-slate-400 text-sm font-medium italic">Empty nodes in current directory scope.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 py-3 w-56 animate-in zoom-in-95 duration-100 shadow-blue-900/10"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-5 py-2 border-b border-slate-50 mb-2">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">{contextMenu.item.name}</p>
                    </div>
                    {!contextMenu.item.is_dir && (
                        <button
                            onClick={() => handleOpenFile(contextMenu.item)}
                            className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                        >
                            <Edit3 size={16} className="text-slate-300 group-hover:text-blue-500" /> Infrastructure Edit
                        </button>
                    )}
                    <button
                        onClick={() => handleRename(contextMenu.item)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                    >
                        <FileText size={16} className="text-slate-300 group-hover:text-blue-500" /> Identity Shift
                    </button>
                    {!contextMenu.item.is_dir && (
                        <button
                            onClick={() => handleDownload(contextMenu.item)}
                            className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                        >
                            <Download size={16} className="text-slate-300 group-hover:text-blue-500" /> Payload Extract
                        </button>
                    )}
                    <button
                        onClick={() => openInTerminal(contextMenu.item)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                    >
                        <TerminalIcon size={16} className="text-slate-300 group-hover:text-blue-500" /> Terminal Access
                    </button>
                    <div className="h-px bg-slate-50 my-2" />
                    <button
                        onClick={() => handleDelete(contextMenu.item.path)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-rose-500 hover:bg-rose-50 transition-all group"
                    >
                        <Trash2 size={16} className="text-rose-300 group-hover:text-rose-500" /> Terminate Node
                    </button>
                </div>
            )}

            {/* File Editor Modal */}
            {editingFile && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-6xl h-[90vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-blue-400 shadow-2xl shadow-blue-900/20">
                                    <TerminalIcon size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-3">
                                        Editor Core
                                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Active Stream</span>
                                    </h3>
                                    <p className="text-slate-400 font-medium text-sm mt-2 flex items-center gap-2">
                                        <Box size={14} className="text-slate-300" /> {editingFile.path}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setEditingFile(null)}
                                    className="px-6 py-3 font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[10px] transition-all"
                                >
                                    Abort Session
                                </button>
                                <button
                                    onClick={handleSaveFile}
                                    disabled={saving}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                                    {saving ? 'Synchronizing...' : 'Commit Changes'}
                                </button>
                                <button
                                    onClick={() => setEditingFile(null)}
                                    className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-2xl transition-all shadow-sm"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-[#0f172a] relative group/editor">
                            <div className="absolute top-8 left-8 opacity-5 text-white pointer-events-none group-hover/editor:opacity-10 transition-opacity">
                                <FileText size={120} />
                            </div>
                            <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                className="w-full h-full bg-transparent text-emerald-400 font-mono text-sm p-12 outline-none resize-none selection:bg-blue-500/40 relative z-10 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                                spellCheck={false}
                                autoFocus
                            />
                        </div>

                        <div className="px-10 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol: UTF-8</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engine: VFS-1.0</span>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Cursor tracked via Reactive Stream
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Clone Modal */}
            {showClone && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <GitBranch size={100} />
                        </div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Code Recruitment</h3>
                                <p className="text-slate-400 font-medium text-sm mt-3 flex items-center gap-2">
                                    <Activity size={14} className="text-emerald-500" /> Remote repository ingestion
                                </p>
                            </div>
                            <button onClick={() => setShowClone(false)} className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleClone} className="space-y-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Source URL</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                                        <Layers size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="https://github.com/user/repo"
                                        className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-emerald-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                        value={cloneForm.url}
                                        onChange={e => setCloneForm({ ...cloneForm, url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Remote Branch</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                                        <GitBranch size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="main (default)"
                                        className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-emerald-100 focus:bg-white transition-all font-bold text-slate-700 tracking-tight"
                                        value={cloneForm.branch}
                                        onChange={e => setCloneForm({ ...cloneForm, branch: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex gap-4">
                                <Loader2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest leading-none">Security Policy</p>
                                    <p className="text-[10px] text-emerald-600/80 font-bold leading-relaxed uppercase tracking-tight">
                                        Repository will be recruited into <code className="bg-white/60 px-1 rounded">/var/www</code>. Ensure public accessibility or provide keys.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={cloning}
                                className="w-full bg-emerald-600 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {cloning ? <RefreshCw size={14} className="animate-spin" /> : <GitBranch size={14} />}
                                {cloning ? 'Ingesting...' : 'Initialize Recruit'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Terminal Modal */}
            {showTerminal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-6xl h-[85vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100 ring-1 ring-slate-200">
                        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-slate-800 text-blue-400 rounded-xl flex items-center justify-center shadow-lg">
                                    <TerminalIcon size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight leading-none uppercase flex items-center gap-3">
                                        Virtual Terminal
                                        <span className="px-2.5 py-0.5 bg-blue-500 text-white rounded text-[8px] font-black uppercase tracking-[0.2em]">TTY Session</span>
                                    </h3>
                                    <p className="text-[10px] font-mono text-slate-500 mt-2 flex items-center gap-2">
                                        <Box size={10} /> {terminalModalPath}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTerminal(false)}
                                className="w-10 h-10 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-800 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-[#0f172a] p-4">
                            <Terminal path={terminalModalPath} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilesPage;
