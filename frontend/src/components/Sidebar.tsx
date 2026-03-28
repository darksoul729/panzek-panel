import { LayoutDashboard, Server, Activity, FolderTree, Settings, LogOut, Zap, Globe, Terminal, Database } from 'lucide-react';

const Sidebar = ({ currentPage, onPageChange, onLogout, isOpen }: any) => {
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'system', icon: Server, label: 'System Kernel' },
        { id: 'sites', icon: Globe, label: 'Web Deployments' },
        { id: 'databases', icon: Database, label: 'Data Stores' },
        { id: 'services', icon: Zap, label: 'Services' },
        { id: 'terminal', icon: Terminal, label: 'Terminal' },
        { id: 'files', icon: FolderTree, label: 'File Manager' },
        { id: 'logs', icon: Activity, label: 'Event Logs' },
        { id: 'settings', icon: Settings, label: 'Preferences' },
    ];

    return (
        <div className={`fixed left-4 top-4 bottom-4 md:left-6 md:top-6 md:bottom-6 w-[260px] bg-white rounded-[2rem] border border-neutral-200 flex flex-col z-50 shadow-sm overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-[150%] md:translate-x-0'}`}>
            <div className="p-8 flex items-center gap-4">
                <div className="bg-black p-3 rounded-[1.2rem] text-white shadow-xl">
                    <Server size={22} className="stroke-[2.5px]" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tighter text-black leading-none">Panzek</h1>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mt-1">Panel OS</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto hide-scrollbar">
                {menuItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onPageChange(item.id)}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 translate-x-1'
                                : 'text-neutral-500 hover:bg-neutral-50 hover:text-black hover:translate-x-1'
                                }`}
                        >
                            <item.icon size={20} className={`${isActive ? 'text-white' : 'group-hover:text-indigo-600'} transition-colors stroke-[2.5px]`} />
                            <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            <div className="p-6 mt-auto">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-neutral-500 bg-neutral-50 hover:bg-black hover:text-white transition-all font-bold text-sm tracking-wide group border border-transparent hover:border-black"
                >
                    <LogOut size={16} className="group-hover:text-white stroke-[3px]" />
                    Disconnect
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
