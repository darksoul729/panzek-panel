import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SystemPage from './pages/SystemPage';
import ServicesPage from './pages/ServicesPage';
import FilesPage from './pages/FilesPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import SitesPage from './pages/SitesPage';
import TerminalPage from './pages/TerminalPage';
import DatabasesPage from './pages/DatabasesPage';
import { Server, Lock, Menu, X } from 'lucide-react';

function App() {
  const sitesRootPath = '/var/www';
  const [currentPage, setCurrentPage] = useState(window.location.hash.replace('#', '') || 'dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync hash with state
  useEffect(() => {
    const handleHashChange = () => {
      const page = window.location.hash.replace('#', '') || 'dashboard';
      setCurrentPage(page);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handlePageChange = (page: string) => {
    window.location.hash = page;
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'system': return <SystemPage />;
      case 'services': return <ServicesPage />;
      case 'files': return <FilesPage />;
      case 'logs': return <LogsPage />;
      case 'settings': return <SettingsPage />;
      case 'sites': return <SitesPage />;
      case 'databases': return <DatabasesPage />;
      case 'terminal': return <TerminalPage path={sitesRootPath} />;
      default: return (
        <div className="bg-white rounded-[2rem] border border-neutral-200 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-100 text-neutral-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Server size={40} />
          </div>
          <h3 className="text-2xl font-black text-black tracking-tight">{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} Coming Soon</h3>
          <p className="text-neutral-500 mt-2 max-w-md mx-auto font-medium">This module is currently under development in the new Go backend.</p>
        </div>
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-inter selection:bg-indigo-200">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-neutral-200 relative overflow-hidden">
          <div className="text-center mb-10 relative z-10">
            <div className="mx-auto w-16 h-16 bg-black text-white flex items-center justify-center rounded-3xl mb-6 shadow-xl">
              <Lock size={28} />
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight">Welcome Back</h1>
            <p className="text-neutral-500 mt-1 font-bold text-sm tracking-wide">Login to Panzek Panel</p>
          </div>
          <form className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Username</label>
              <input
                type="text"
                className="w-full px-5 py-4 rounded-2xl bg-neutral-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none font-bold text-black"
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Password</label>
              <input
                type="password"
                className="w-full px-5 py-4 rounded-2xl bg-neutral-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none font-bold text-black"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setIsAuthenticated(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px] py-5 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]"
              >
                Sign In Securely
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 font-inter selection:bg-indigo-200 selection:text-indigo-900 flex text-black">
      {/* Mobile Top Nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-white border-b border-neutral-200 z-40 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-xl text-white shadow-xl"><Server size={20} className="stroke-[2.5px]" /></div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-black leading-none">Panzek</h1>
            <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400 mt-0.5">Panel OS</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-black transition-colors">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={() => setIsAuthenticated(false)}
        isOpen={sidebarOpen}
      />
      <main className="flex-1 w-full md:ml-[300px] pt-28 md:pt-8 p-4 md:p-8 min-h-screen max-w-[1920px]">
        {renderPage()}
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

export default App;
