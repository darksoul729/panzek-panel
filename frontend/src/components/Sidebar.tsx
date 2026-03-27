import { LayoutDashboard, Server, Activity, FolderTree, Settings, LogOut, Zap, Globe, Terminal, Database, Network } from 'lucide-react';

const Sidebar = ({ currentPage, onPageChange, onLogout }: any) => {
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'system', icon: Server, label: 'System Info' },
        { id: 'sites', icon: Globe, label: 'Web Sites' },
        { id: 'dns', icon: Network, label: 'DNS Zones' },
        { id: 'databases', icon: Database, label: 'Databases' },
        { id: 'services', icon: Zap, label: 'Services' },
        { id: 'terminal', icon: Terminal, label: 'Terminal' },
        { id: 'files', icon: FolderTree, label: 'File Manager' },
        { id: 'logs', icon: Activity, label: 'Logs' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <Server size={24} />
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">HomePanel</h1>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPageChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentPage === item.id
                            ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm shadow-blue-100'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
