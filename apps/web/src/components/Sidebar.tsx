import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Project } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from './icons';
import { useAsync, useToast } from './ui';

const NAV: { to: string; icon: string; label: string }[] = [
  { to: '/', icon: 'home', label: 'Dashboard' },
  { to: '/projects', icon: 'layers', label: 'Projects' },
  { to: '/build', icon: 'code', label: 'App Builder' },
  { to: '/qa', icon: 'flask', label: 'Testing' },
  { to: '/security', icon: 'shield', label: 'Security' },
  { to: '/deploy', icon: 'cloud', label: 'Deploy' },
  { to: '/environments', icon: 'server', label: 'Environments' },
  { to: '/monitoring', icon: 'pulse', label: 'Monitoring' },
  { to: '/agents', icon: 'cpu', label: 'AI Agents' },
  { to: '/integrations', icon: 'puzzle', label: 'Integrations' },
  { to: '/settings', icon: 'gear', label: 'Settings' },
];

export function Shell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const summary = useAsync(() => api.dashboard.summary(), [loc.pathname]);
  const projects = useAsync(() => api.projects.list(), []);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { pages: [] as typeof NAV, projs: [] as Project[] };
    return {
      pages: NAV.filter((n) => n.label.toLowerCase().includes(t)),
      projs: (projects.data ?? []).filter((p) => (p.name + p.type).toLowerCase().includes(t)).slice(0, 5),
    };
  }, [q, projects.data]);

  const tokens = summary.data?.tokens ?? { used: 0, cap: 5_000_000 };
  const initials = (user?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const go = (to: string) => { setQ(''); setFocus(false); nav(to); };

  return (
    <div className="app">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <Icon name="shield" />
          <div><b>Asset <span>Sentinel</span> AI</b><small>Build Studio</small></div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
              <Icon name={n.icon} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="usage">
          <div className="row"><Icon name="sparkle" />AI Tokens</div>
          <div className="nums"><span>{tokens.used.toLocaleString()}</span><span>/ {tokens.cap.toLocaleString()}</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (tokens.used / tokens.cap) * 100)}%` }} /></div>
        </div>
      </aside>
      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />

      <main className="main">
        <div className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="search">
            <label>
              <Icon name="search" />
              <input
                ref={searchRef}
                value={q}
                placeholder="Search projects and pages"
                aria-label="Search"
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocus(true)}
                onBlur={() => window.setTimeout(() => setFocus(false), 150)}
              />
              <span className="kbd">Ctrl K</span>
            </label>
            <div className={`drop${focus && q ? ' on' : ''}`}>
              {results.pages.length > 0 && <h4>Pages</h4>}
              {results.pages.map((p) => <button key={p.to} onMouseDown={() => go(p.to)}><Icon name={p.icon} />{p.label}</button>)}
              {results.projs.length > 0 && <h4>Projects</h4>}
              {results.projs.map((p) => <button key={p.id} onMouseDown={() => go(`/projects/${p.id}`)}><Icon name="folder" />{p.name}<small>{p.type}</small></button>)}
              {!results.pages.length && !results.projs.length && <p className="empty">No matches</p>}
            </div>
          </div>
          <div className="spacer" />
          <button className="icon-btn" aria-label="Help" onClick={() => toast('Docs live in the docs/ folder of the repository.')}><Icon name="help" /></button>
          <div className="rel">
            <button className="user" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
              <span className="avatar">{initials}</span>
              <div><b>{user?.name}</b><small>{user?.role}</small></div>
            </button>
            <div className={`drop right${menu ? ' on' : ''}`}>
              <button onClick={() => { setMenu(false); nav('/settings'); }}><Icon name="user" />Profile and settings</button>
              <button onClick={() => { logout(); nav('/login'); }}><Icon name="logout" />Sign out</button>
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
