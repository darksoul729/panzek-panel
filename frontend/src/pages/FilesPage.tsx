import { useEffect, useState } from 'react';
import { Folder, FileText, ChevronLeft, Search, HardDrive, Trash2, FolderPlus, ExternalLink, GitBranch, X, Loader2, Edit3, Download, Terminal as TerminalIcon, ChevronRight, LayoutGrid, Box, Activity, Database, RefreshCw, Layers } from 'lucide-react';
import api from '../services/api';
import Terminal from '../components/Terminal';

const SITES_ROOT = '/var/www';

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
        setTerminalModalPath(targetPath === '.' ? SITES_ROOT : `${SITES_ROOT}/${targetPath}`);
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
                path: path === '.' ? `${SITES_ROOT}/${cloneForm.url.split('/').pop()?.replace('.git', '')}` : `${SITES_ROOT}/${path}/${cloneForm.url.split('/').pop()?.replace('.git', '')}`
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
            <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-neutral-900 pointer-events-none">
                    <Box size={200} />
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative z-10 w-full">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-6 w-full xl:w-auto">
                        <button
                            onClick={goBack}
                            disabled={path === '.'}
                            className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-neutral-50 flex items-center justify-center rounded-[1.2rem] sm:rounded-3xl text-neutral-400 hover:bg-neutral-100 hover:text-black transition-all border border-neutral-200/50 disabled:opacity-30 active:scale-90"
                        >
                            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-none break-all">Virtual System</h2>
                                <span className="px-3 py-1 bg-neutral-100 text-black rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-neutral-200 whitespace-nowrap">Live Browser</span>
                            </div>
                            <div className="flex items-center gap-2 mt-3 sm:mt-4 overflow-x-auto no-scrollbar w-full hide-scrollbar pb-2">
                                {breadcrumbs.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 shrink-0">
                                        {i > 0 && <ChevronRight size={12} className="text-neutral-300" />}
                                        <button
                                            onClick={() => navigateToBreadcrumb(i)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === breadcrumbs.length - 1 ? 'bg-black text-white shadow-lg shadow-sm' : 'bg-neutral-50 text-neutral-400 hover:bg-neutral-100'}`}
                                        >
                                            {b}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                        <div className="relative group flex-1 sm:flex-none">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-black transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Scan directory..."
                                className="w-full sm:w-64 pl-12 pr-6 py-4 rounded-2xl sm:rounded-3xl bg-neutral-50 border-2 border-transparent outline-none focus:border-neutral-200 focus:bg-white transition-all font-bold text-neutral-700 text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowClone(true)}
                            className="bg-black hover:bg-neutral-800 text-white px-6 py-4 rounded-2xl sm:rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 group whitespace-nowrap shrink-0"
                        >
                            <GitBranch size={20} className="group-hover:rotate-12 transition-transform" />
                            Clone
                        </button>
                    </div>
                </div>
            </div>

            {/* Storage Intelligence Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-neutral-100/50 p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm shadow-sm">
                <div className="lg:col-span-2 flex items-center gap-6 px-4">
                    <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center border-4 border-white shadow-xl shadow-sm">
                        <HardDrive className="text-white" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-neutral-900">Virtual Root</h4>
                            <span className="px-3 py-1 bg-neutral-200 text-black rounded-full text-[10px] font-black uppercase tracking-widest">Mounted</span>
                        </div>
                        <p className="text-neutral-500 text-sm font-medium leading-tight">
                            Accessing localized system volume at <code className="bg-white/50 px-1.5 rounded text-black font-bold">{SITES_ROOT}</code>.
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Directory Stats</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center text-black">
                            <LayoutGrid size={16} />
                        </div>
                        <p className="font-black text-neutral-700 text-[11px] tracking-tight">{dirStats.folders} Folders • {dirStats.files} Files</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 flex flex-col justify-center border border-white shadow-sm">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Node Activity</span>
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center text-black">
                            <Activity size={16} />
                        </div>
                        <p className="font-black text-neutral-700 text-[11px] tracking-tight">Active Indexing</p>
                    </div>
                </div>
            </div>

            {/* Files Grid List */}
            <div className="flex-1 bg-white xl:rounded-[2.5rem] rounded-[2rem] border border-neutral-200 shadow-sm overflow-hidden flex flex-col mt-4">
                <div className="grid grid-cols-4 md:grid-cols-12 px-6 sm:px-10 py-6 border-b border-neutral-50 text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50/20">
                    <div className="col-span-3 md:col-span-6">Name / Identifier</div>
                    <div className="hidden md:block col-span-2">Payload Size</div>
                    <div className="hidden md:block col-span-3">Object Type</div>
                    <div className="col-span-1 text-right flex justify-end">
                        <button onClick={handleMkdir} className="w-8 h-8 bg-white border border-neutral-200 rounded-lg flex items-center justify-center text-black hover:border-black-200 transition-all active:scale-90 shadow-sm" title="New Folder">
                            <FolderPlus size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-neutral-50 min-h-[400px]">
                    {filteredItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-4 md:grid-cols-12 px-6 sm:px-10 py-4 sm:py-5 hover:bg-neutral-50/50 transition-all duration-300 group items-center relative overflow-hidden"
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-black opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />

                            <div
                                className="col-span-3 md:col-span-6 flex items-center gap-4 sm:gap-5 cursor-pointer min-w-0 pr-4"
                                onClick={() => item.is_dir ? fetchFiles(item.path) : handleOpenFile(item)}
                            >
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all ${item.is_dir ? 'bg-neutral-100 text-black group-hover:bg-black group-hover:text-white shadow-sm' : 'bg-neutral-50 text-neutral-400 group-hover:bg-white group-hover:text-neutral-600 shadow-sm border border-transparent group-hover:border-neutral-200'}`}>
                                    {item.is_dir ? <Folder className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="currentColor" fillOpacity={0.2} /> : <FileText className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-neutral-800 text-sm sm:text-lg leading-tight truncate tracking-tight">{item.name}</span>
                                    <span className="text-[9px] sm:text-[10px] font-mono text-neutral-400 truncate mt-0.5 sm:mt-1">{item.path}</span>
                                </div>
                            </div>

                            <div className="hidden md:flex col-span-2 text-xs font-bold text-neutral-400 items-center gap-2">
                                <Database size={12} className="text-neutral-200" />
                                {item.is_dir ? '--' : (item.size / 1024).toFixed(1) + ' KB'}
                            </div>

                            <div className="hidden md:block col-span-3">
                                <span className={`px-3 sm:px-4 py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${item.is_dir ? 'bg-neutral-100 text-black border-neutral-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}>
                                    {item.is_dir ? 'Folder Node' : item.name.split('.').pop()?.toUpperCase() + ' Binary'}
                                </span>
                            </div>

                            <div className="col-span-1 flex justify-end">
                                <div className="flex justify-end gap-1 sm:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transform md:translate-x-4 md:group-hover:translate-x-0 transition-all duration-300">
                                    <button
                                        onClick={() => handleDelete(item.path)}
                                        className="p-2 sm:p-3 text-neutral-400 hover:text-black transition-colors hover:bg-neutral-100 rounded-xl active:scale-90"
                                        title="Delete Object"
                                    >
                                        <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    </button>
                                    <button
                                        className="p-2 sm:p-3 text-neutral-400 hover:text-black transition-colors hover:bg-neutral-100 rounded-xl active:scale-90"
                                        onClick={() => item.is_dir ? fetchFiles(item.path) : handleOpenFile(item)}
                                        title="Open / Edit"
                                    >
                                        <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-32 bg-neutral-50/20">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-neutral-200 shadow-sm mb-6">
                                <Search size={40} />
                            </div>
                            <h4 className="text-xl font-black text-neutral-800 mb-2">No Matches Found</h4>
                            <p className="text-neutral-400 text-sm font-medium italic">Empty nodes in current directory scope.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-white rounded-[1.5rem] shadow-2xl border border-neutral-200 py-3 w-56 animate-in zoom-in-95 duration-100 shadow-sm/10"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-5 py-2 border-b border-neutral-50 mb-2">
                        <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest truncate">{contextMenu.item.name}</p>
                    </div>
                    {!contextMenu.item.is_dir && (
                        <button
                            onClick={() => handleOpenFile(contextMenu.item)}
                            className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-neutral-600 hover:bg-neutral-100 hover:text-black transition-all group"
                        >
                            <Edit3 size={16} className="text-neutral-300 group-hover:text-black" /> Infrastructure Edit
                        </button>
                    )}
                    <button
                        onClick={() => handleRename(contextMenu.item)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-neutral-600 hover:bg-neutral-100 hover:text-black transition-all group"
                    >
                        <FileText size={16} className="text-neutral-300 group-hover:text-black" /> Identity Shift
                    </button>
                    {!contextMenu.item.is_dir && (
                        <button
                            onClick={() => handleDownload(contextMenu.item)}
                            className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-neutral-600 hover:bg-neutral-100 hover:text-black transition-all group"
                        >
                            <Download size={16} className="text-neutral-300 group-hover:text-black" /> Payload Extract
                        </button>
                    )}
                    <button
                        onClick={() => openInTerminal(contextMenu.item)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-neutral-600 hover:bg-neutral-100 hover:text-black transition-all group"
                    >
                        <TerminalIcon size={16} className="text-neutral-300 group-hover:text-black" /> Terminal Access
                    </button>
                    <div className="h-px bg-neutral-50 my-2" />
                    <button
                        onClick={() => handleDelete(contextMenu.item.path)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-black hover:bg-neutral-100 transition-all group"
                    >
                        <Trash2 size={16} className="text-black-300 group-hover:text-black" /> Terminate Node
                    </button>
                </div>
            )}

            {/* File Editor Modal */}
            {editingFile && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
                    <div className="bg-neutral-950 w-full h-full sm:h-[95vh] sm:max-w-7xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/5 ring-1 ring-white/10">
                        <div className="px-6 py-4 sm:px-10 sm:py-6 border-b border-white/10 flex justify-between items-center bg-neutral-900/50 backdrop-blur-md">
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 border border-white/10">
                                    <TerminalIcon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none flex items-center gap-3">
                                        Editor Core
                                        <span className="hidden sm:inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-500/30">Active</span>
                                    </h3>
                                    <p className="text-white/40 font-mono text-[10px] mt-1.5 truncate">
                                        {editingFile.path}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <button
                                    onClick={handleSaveFile}
                                    disabled={saving}
                                    className="px-4 py-2 sm:px-6 sm:py-3 bg-white text-black rounded-xl font-black uppercase tracking-wider text-[9px] sm:text-[10px] hover:bg-neutral-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
                                    {saving ? 'Syncing...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => setEditingFile(null)}
                                    className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-neutral-950 relative overflow-hidden">
                            <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                className="w-full h-full bg-transparent text-neutral-300 font-mono text-xs sm:text-sm p-6 sm:p-12 outline-none resize-none selection:bg-white/20 relative z-10 leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                spellCheck={false}
                                autoFocus
                            />
                        </div>

                        <div className="px-6 py-3 sm:px-10 sm:py-4 bg-neutral-900/50 border-t border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                    <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-widest">UTF-8</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                    <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-widest">VFS-1.0</span>
                                </div>
                            </div>
                            <span className="hidden sm:inline-block text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-widest">
                                Kernel Active Session
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Clone Modal */}
            {showClone && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <GitBranch size={100} />
                        </div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-neutral-900 tracking-tight leading-none">Code Recruitment</h3>
                                <p className="text-neutral-400 font-medium text-sm mt-3 flex items-center gap-2">
                                    <Activity size={14} className="text-black" /> Remote repository ingestion
                                </p>
                            </div>
                            <button onClick={() => setShowClone(false)} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-3xl text-neutral-400 hover:text-neutral-600 transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleClone} className="space-y-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Source URL</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-black transition-colors">
                                        <Layers size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="https://github.com/user/repo"
                                        className="w-full pl-16 pr-6 py-5 rounded-3xl bg-neutral-50 border-2 border-transparent outline-none focus:border-neutral-200 focus:bg-white transition-all font-bold text-neutral-700 tracking-tight"
                                        value={cloneForm.url}
                                        onChange={e => setCloneForm({ ...cloneForm, url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Remote Branch</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-black transition-colors">
                                        <GitBranch size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="main (default)"
                                        className="w-full pl-16 pr-6 py-5 rounded-3xl bg-neutral-50 border-2 border-transparent outline-none focus:border-neutral-200 focus:bg-white transition-all font-bold text-neutral-700 tracking-tight"
                                        value={cloneForm.branch}
                                        onChange={e => setCloneForm({ ...cloneForm, branch: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-neutral-100/50 p-5 rounded-3xl border border-neutral-200 flex gap-4">
                                <Loader2 className="text-black shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-[10px] text-black font-black uppercase tracking-widest leading-none">Security Policy</p>
                                    <p className="text-[10px] text-black/80 font-bold leading-relaxed uppercase tracking-tight">
                                        Repository will be recruited into <code className="bg-white/60 px-1 rounded">{SITES_ROOT}</code>. Ensure public accessibility or provide keys.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={cloning}
                                className="w-full bg-black text-white rounded-3xl py-5 font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-neutral-950 w-full h-full sm:h-[85vh] sm:max-w-7xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/5 ring-1 ring-white/10">
                        <div className="px-6 py-4 sm:px-10 sm:py-6 border-b border-white/10 flex justify-between items-center bg-neutral-900/50 backdrop-blur-md text-white">
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 border border-white/10">
                                    <TerminalIcon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-black tracking-tight leading-none uppercase flex items-center gap-3">
                                        Virtual Terminal
                                        <span className="hidden sm:inline-block px-2.5 py-0.5 bg-black text-white rounded text-[8px] font-black uppercase tracking-[0.2em] border border-white/10">TTY Session</span>
                                    </h3>
                                    <p className="text-white/40 font-mono text-[10px] mt-1.5 truncate">
                                        {terminalModalPath}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTerminal(false)}
                                className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all flex items-center justify-center border border-white/10 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-neutral-950 relative">
                            <Terminal path={terminalModalPath} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilesPage;
