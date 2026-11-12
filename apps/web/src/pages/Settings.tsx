import { useState } from 'react';
import type { Preferences } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from '../components/icons';
import { ConfirmModal, Field, Loading, Modal, Switch, timeAgo, useAsync, useToast } from '../components/ui';

type Tab = 'profile' | 'keys' | 'team' | 'billing' | 'prefs';
const TABS: [Tab, string][] = [['profile', 'Profile'], ['keys', 'API keys'], ['team', 'Team'], ['billing', 'Billing'], ['prefs', 'Preferences']];

export function Settings() {
  const [tab, setTab] = useState<Tab>('profile');
  return (
    <>
      <div className="page-h"><div className="grow"><h1>Settings</h1></div></div>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'profile' && <Profile />}
      {tab === 'keys' && <Keys />}
      {tab === 'team' && <Team />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'prefs' && <Prefs />}
    </>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? '', org: user?.org ?? '' });
  const save = async () => { try { setUser(await api.auth.updateMe(f)); toast('Profile saved'); } catch (e) { toast((e as Error).message); } };
  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      {(['name', 'email', 'role', 'org'] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input className="fi" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
      <button className="btn primary" onClick={save}>Save changes</button>
    </div>
  );
}

function Keys() {
  const toast = useToast();
  const { data, error, reload } = useAsync(() => api.settings.keys(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [created, setCreated] = useState('');
  const [del, setDel] = useState<string | null>(null);
  const create = async () => { try { const r = await api.settings.createKey(name); setCreated(r.key); setAdding(false); setName(''); reload(); } catch (e) { toast((e as Error).message); } };
  return (
    <div className="panel">
      <div className="toolbar"><button className="btn primary sm" onClick={() => setAdding(true)}><Icon name="plus" />Create key</button></div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <p className="empty">No API keys.</p> : (
        <div className="tw"><table><thead><tr><th>Name</th><th>Key</th><th>Created</th><th /></tr></thead><tbody>
          {data.map((k) => <tr key={k.id}><td>{k.name}</td><td><code>{k.prefix}…{k.last4}</code></td><td>{timeAgo(k.createdAt)}</td><td><button className="more" aria-label="Delete key" onClick={() => setDel(k.id)}><Icon name="trash" /></button></td></tr>)}
        </tbody></table></div>
      )}
      {adding && <Modal title="Create API key" onClose={() => setAdding(false)} footer={<><button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary sm" disabled={name.trim().length < 2} onClick={create}>Create</button></>}>
        <Field label="Name"><input className="fi" value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" /></Field></Modal>}
      {created && <Modal title="Copy your key now" onClose={() => setCreated('')} footer={<button className="btn primary sm" onClick={() => { navigator.clipboard?.writeText(created); toast('Copied'); }}><Icon name="copy" />Copy</button>}>
        <p>This is the only time the full key is shown.</p><pre className="log" style={{ marginTop: 10 }}>{created}</pre></Modal>}
      {del && <ConfirmModal title="Delete key" danger confirmLabel="Delete" text="Anything using this key will stop working." onClose={() => setDel(null)} onConfirm={async () => { await api.settings.deleteKey(del); reload(); }} />}
    </div>
  );
}

function Team() {
  const toast = useToast();
  const { data, error, reload } = useAsync(() => api.settings.team(), []);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Developer');
  const invite = async () => { try { await api.settings.invite(email, role); toast('Invitation sent'); setAdding(false); setEmail(''); reload(); } catch (e) { toast((e as Error).message); } };
  const remove = async (id: string) => { try { await api.settings.removeMember(id); reload(); } catch (e) { toast((e as Error).message); } };
  return (
    <div className="panel">
      <div className="toolbar"><button className="btn primary sm" onClick={() => setAdding(true)}><Icon name="plus" />Invite member</button></div>
      {!data ? <Loading error={error} /> : (
        <div className="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
          {data.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.role}</td><td><span className={`status ${m.status === 'Active' ? 'pass' : 'warn'}`}>{m.status}</span></td>
            <td>{m.role !== 'Owner' && <button className="more" aria-label={`Remove ${m.name}`} onClick={() => remove(m.id)}><Icon name="trash" /></button>}</td></tr>)}
        </tbody></table></div>
      )}
      {adding && <Modal title="Invite member" onClose={() => setAdding(false)} footer={<><button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary sm" disabled={!/\S+@\S+\.\S+/.test(email)} onClick={invite}>Send invite</button></>}>
        <Field label="Email"><input className="fi" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Role"><select className="fi" value={role} onChange={(e) => setRole(e.target.value)}>{['Admin', 'Developer', 'QA Engineer', 'Viewer'].map((r) => <option key={r}>{r}</option>)}</select></Field></Modal>}
    </div>
  );
}

function BillingTab() {
  const { data, error } = useAsync(() => api.settings.billing(), []);
  if (!data) return <Loading error={error} />;
  const pct = Math.min(100, (data.tokens.used / data.tokens.cap) * 100);
  return (
    <div className="grid g2">
      <div className="panel"><h2><Icon name="sparkle" />{data.plan} plan</h2>
        <p>{data.tokens.used.toLocaleString()} of {data.tokens.cap.toLocaleString()} AI tokens used</p><div className="bar big"><i style={{ width: `${pct}%` }} /></div></div>
      <div className="panel"><h2><Icon name="brief" />Invoices</h2>
        <table><tbody>{data.invoices.map((i) => <tr key={i.period}><td>{i.period}</td><td>{i.amount}</td><td><span className={`status ${i.status === 'Paid' ? 'pass' : 'warn'}`}>{i.status}</span></td></tr>)}</tbody></table></div>
    </div>
  );
}

function Prefs() {
  const toast = useToast();
  const { data, error, setData } = useAsync(() => api.settings.prefs(), []);
  if (!data) return <Loading error={error} />;
  const rows: [keyof Preferences, string, string][] = [
    ['emailNotif', 'Email notifications', 'Get notified about runs and deployments'],
    ['autoTest', 'Auto-run tests', 'Run all suites after a project is generated'],
    ['autoScan', 'Auto security scan', 'Scan right after generation'],
    ['autoDeploy', 'Auto-deploy to DEV', 'Deploy generated apps to the DEV environment'],
  ];
  const set = async (k: keyof Preferences, v: boolean) => {
    const prev = data; setData({ ...data, [k]: v });
    try { setData(await api.settings.setPrefs({ [k]: v })); } catch (e) { setData(prev); toast((e as Error).message); }
  };
  return <div className="panel" style={{ maxWidth: 640 }}>{rows.map(([k, t, s]) => <div className="prefrow" key={k}><div><b>{t}</b><small>{s}</small></div><Switch on={data[k]} label={t} onChange={(v) => set(k, v)} /></div>)}</div>;
}
