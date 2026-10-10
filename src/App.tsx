import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/ThemeToggle';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { LayoutDashboard, Users, FileText, Settings, Plus, PieChart } from 'lucide-react';
// We'll create these pages shortly
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import Activity from './pages/Activity';
import Analyze from './pages/Analyze';
import SettingsPage from './pages/Settings';
import PersonDetail from './pages/PersonDetail';
import SettleUp from './pages/SettleUp';
import { useDBInit } from './hooks/useDBInit';
import AddExpenseModal from './components/AddExpenseModal';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/friends', label: 'Friends', icon: Users, end: false },
  { to: '/analyze', label: 'Analyze', icon: PieChart, end: false },
  { to: '/activity', label: 'Activity', icon: FileText, end: false },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const el = document.getElementById('main-scroll-area');
    if (el) el.scrollTop = 0;
  }, [pathname]);
  return null;
}



function AppShell() {
  const [showAdd, setShowAdd] = useState(false);
  const location = useLocation();
  const isInitialized = useDBInit();

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-widest">
          Initializing Local DB...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background md:flex-row overflow-hidden font-sans">
      {/* ── Top bar (Mobile only) ───────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:hidden z-[var(--z-nav)] pt-safe">
        <div className="flex items-center gap-2 font-semibold text-primary tracking-tight">
          SplitLocal
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NavLink 
            to="/settings" 
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </NavLink>
        </div>
      </header>

      {/* ── Sidebar (Desktop only) ──────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30 z-[var(--z-nav)]">
        <div className="flex h-14 items-center justify-between px-6 border-b border-transparent">
          <div className="flex items-center gap-2 font-bold text-primary tracking-tight">
            SplitLocal
          </div>
        </div>
        
        <div className="px-4 py-4 flex items-center justify-between">
           <ThemeToggle />
           <NavLink 
             to="/settings" 
             className="hidden md:flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
             aria-label="Settings"
           >
             <Settings className="h-5 w-5" />
           </NavLink>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </nav>
        <div className="p-4 text-xs text-muted-foreground/60">
          <p>SplitLocal - Offline First</p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main id="main-scroll-area" className="flex-1 overflow-y-auto relative pb-[calc(var(--nav-height)+var(--fab-clearance)+env(safe-area-inset-bottom))] md:pb-0 scroll-smooth">
        <ScrollToTop />
        <div className="mx-auto max-w-5xl p-4 md:p-8 lg:p-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/friends/:id" element={<PersonDetail />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settle" element={<SettleUp />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-4xl font-bold text-muted-foreground/20 mb-4">404</div>
                <p className="text-muted-foreground">This page doesn't exist.</p>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* ── Floating Action Button (Mobile only) ─────────────────── */}
      <div className="fixed right-4 z-[var(--z-fab)] md:hidden" style={{ bottom: 'calc(var(--nav-height) + 1rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Add expense"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* ── Bottom nav (Mobile only) ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md pb-safe md:hidden">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex h-full flex-1 flex-col items-center justify-center gap-1 relative"
            >
              <div className={`flex flex-col items-center justify-center transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] font-medium tracking-wide mt-1">{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Add Button for Desktop */}
      <div className="hidden md:block fixed bottom-8 right-8 z-[var(--z-fab)]">
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:-translate-y-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Add expense"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="splitlocal-theme">
      <BrowserRouter>
        <TooltipProvider>
          <AppShell />
          <Toaster />
        </TooltipProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
