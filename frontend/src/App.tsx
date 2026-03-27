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
import DnsPage from './pages/DnsPage';
import { Server } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState(window.location.hash.replace('#', '') || 'dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(true);

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
      case 'dns': return <DnsPage />;
      case 'databases': return <DatabasesPage />;
      case 'terminal': return <TerminalPage path="/var/www" />;
      default: return (
        <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Server size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} Coming Soon</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">We are currently implementing this feature using the new Go backend.</p>
        </div>
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-inter">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-2">Login to manage your Home Server</p>
          </div>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAuthenticated(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={() => setIsAuthenticated(false)}
      />
      <main className="ml-64 p-8 min-h-screen">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
