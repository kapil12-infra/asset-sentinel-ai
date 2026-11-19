import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { DeployMethod, ProjectFile } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { ConfirmModal, Field, Loading, Modal, StatusChip, download, timeAgo, useAsync, useToast } from '../components/ui';
import { RunTable, ScanPanel, EnvTable } from '../components/Tables';

type Tab = 'overview' | 'code' | 'tests' | 'security' | 'deploy';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['code', 'Code'], ['tests', 'Tests'], ['security', 'Security'], ['deploy', 'Deploy']];

export function ProjectDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [del, setDel] = useState(false);
  const { data: p, error, reload } = useAsync(() => api.projects.get(id), [id]);
  if (!p) return <Loading error={error} />;

  return (
    <>
      <div className="crumb"><Link to="/projects">Projects</Link> / <span>{p.name}</span></div>
      <div className="page-h">
        <div className="grow"><h1>{p.name}</h1><p>{p.desc || p.sub}</p></div>
        <StatusChip status={p.status} />
        <button className="btn ghost sm" onClick={async () => { const c = await api.projects.clone(p.id); toast('Cloned'); nav(`/projects/${c.id}`); }}><Icon name="copy" />Clone</button>
        <button className="btn danger sm" onClick={() => setDel(true)}><Icon name="trash" />Delete</button>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'overview' && <Overview id={id} onSaved={reload} />}
      {tab === 'code' && <CodeTab id={id} name={p.name} />}
      {tab === 'tests' && <TestsTab id={id} onRan={reload} />}
      {tab === 'security' && <div className="panel"><ScanPanel projectId={id} onChange={reload} /></div>}
      {tab === 'deploy' && <DeployTab id={id} />}

      {del && <ConfirmModal title="Delete project" danger confirmLabel="Delete" text={`Delete ${p.name}? This cannot be undone.`} onClose={() => setDel(false)}
        onConfirm={async () => { await api.projects.remove(id); toast('Project deleted'); nav('/projects'); }} />}
    </>
  );
}

function Overview({ id, onSaved }: { id: string; onSaved: () => void }) {
  const toast = useToast();
  const { data: p, reload } = useAsync(() => api.projects.get(id), [id]);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  if (!p) return <Loading />;
  const save = async () => {
    try { await api.projects.update(id, { name, desc }); toast('Saved'); setEdit(false); reload(); onSaved(); } catch (e) { toast((e as Error).message); }
  };
  return (
    <>
      <div className="grid g4">
        <div className="kpi"><b>{p.type}</b><span>Type</span></div>
        <div className="kpi infoc"><b>{p.state}</b><span>State</span></div>
        <div className={`kpi ${p.issues ? 'warnc' : 'okc'}`}><b>{p.issues}</b><span>Open issues</span></div>
        <div className="kpi"><b>{timeAgo(p.lastRun)}</b><span>Last test run</span></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <h2><Icon name="brief" />Details<span className="lnk" onClick={() => { setName(p.name); setDesc(p.desc); setEdit(true); }}>Edit<Icon name="edit" /></span></h2>
        <dl className="dl">
          <dt>Name</dt><dd>{p.name}</dd>
          <dt>Description</dt><dd>{p.desc || '—'}</dd>
          <dt>Slug</dt><dd>{p.slug}</dd>
          <dt>Stack</dt><dd><div className="chips">{p.stack.map((s) => <span className="tech" key={s}>{s}</span>)}</div></dd>
          <dt>Created</dt><dd>{new Date(p.createdAt).toLocaleString()}</dd>
          <dt>Stage</dt><dd>
            <select className="fi auto" aria-label="Project state" value={p.state} onChange={async (e) => { await api.projects.update(id, { state: e.target.value as typeof p.state }); reload(); }}>
              {['Planning', 'In Progress', 'In Review', 'Live'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </dd>
        </dl>
      </div>
      {edit && (
        <Modal title="Edit project" onClose={() => setEdit(false)} footer={<><button className="btn ghost sm" onClick={() => setEdit(false)}>Cancel</button><button className="btn primary sm" onClick={save}>Save</button></>}>
          <Field label="Name"><input className="fi" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Description"><textarea className="fi" value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

function CodeTab({ id, name }: { id: string; name: string }) {
  const toast = useToast();
  const { data: files, reload } = useAsync(() => api.projects.files(id), [id]);
  const [open, setOpen] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [assist, setAssist] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [newFile, setNewFile] = useState(false);
  const [path, setPath] = useState('');
  const gut = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (files && !active && files.length) { const first = files.find((f) => f.path.endsWith('App.tsx')) ?? files[0]; setOpen([first.path]); setActive(first.path); }
  }, [files, active]);
  if (!files) return <Loading />;

  const saved = (p: string) => files.find((f) => f.path === p)?.content ?? '';
  const text = (p: string) => drafts[p] ?? saved(p);
  const dirty = (p: string) => drafts[p] !== undefined && drafts[p] !== saved(p);
  const openFile = (p: string) => { setOpen((o) => (o.includes(p) ? o : [...o, p])); setActive(p); };
  const closeTab = (p: string) => { const rest = open.filter((x) => x !== p); setOpen(rest); if (active === p) setActive(rest[rest.length - 1] ?? ''); };

  const save = async () => {
    try {
      await api.projects.saveFile(id, { path: active, content: text(active) });
      setDrafts(({ [active]: _drop, ...rest }) => rest);
      toast(`Saved ${active}`); reload();
    } catch (e) { toast((e as Error).message); }
  };
  const runAssist = async () => {
    try { const r = await api.projects.assist(id, active, prompt); setDrafts((d) => ({ ...d, [active]: r.content })); setAssist(false); setPrompt(''); toast('AI suggestion applied. Review and save.'); } catch (e) { toast((e as Error).message); }
  };
  const create = async () => {
    try { await api.projects.saveFile(id, { path, content: '' }); setNewFile(false); setPath(''); await reload(); openFile(path); } catch (e) { toast((e as Error).message); }
  };
  const remove = async () => {
    try { await api.projects.deleteFile(id, active); closeTab(active); toast('File deleted'); reload(); } catch (e) { toast((e as Error).message); }
  };
  const lines = text(active).split('\n').length;

  return (
    <>
      <div className="ide">
        <div className="explorer">
          <h4>Files<button onClick={() => setNewFile(true)}>+ New</button></h4>
          {files.map((f: ProjectFile) => <button key={f.path} className={`tr${f.path === active ? ' on' : ''}`} onClick={() => openFile(f.path)}><Icon name="file" />{f.path}</button>)}
        </div>
        <div className="editor">
          <div className="etabs">{open.map((p) => (
            <div key={p} className={`etab${p === active ? ' on' : ''}`} onClick={() => setActive(p)}>{p}{dirty(p) && <i />}<button className="x" aria-label={`Close ${p}`} onClick={(e) => { e.stopPropagation(); closeTab(p); }}><Icon name="x" /></button></div>
          ))}</div>
          {active ? (
            <>
              <div className="ebar">
                <span>{active}</span>
                <button className="btn ghost sm" onClick={() => setAssist(true)}><Icon name="sparkle" />AI Assist</button>
                <button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(text(active)); toast('Copied'); }}><Icon name="copy" />Copy</button>
                <button className="btn ghost sm" onClick={() => download(active.split('/').pop() ?? 'file.txt', text(active))}><Icon name="download" />Download</button>
                <button className="btn danger sm" onClick={remove}><Icon name="trash" /></button>
                <button className="btn primary sm" disabled={!dirty(active)} onClick={save}>Save</button>
              </div>
              <div className="ebody">
                <pre className="gut" ref={gut}>{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
                <textarea id="code" aria-label={`Edit ${active}`} spellCheck={false} value={text(active)}
                  onScroll={(e) => { if (gut.current) gut.current.scrollTop = e.currentTarget.scrollTop; }}
                  onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))} />
              </div>
            </>
          ) : <p className="empty">Open a file to start editing {name}.</p>}
        </div>
      </div>
      {assist && <Modal title="AI Assist" onClose={() => setAssist(false)} footer={<><button className="btn ghost sm" onClick={() => setAssist(false)}>Cancel</button><button className="btn primary sm" disabled={prompt.trim().length < 4} onClick={runAssist}>Apply</button></>}>
        <Field label={`What should change in ${active}?`}><textarea className="fi" maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Add input validation" /></Field>
      </Modal>}
      {newFile && <Modal title="New file" onClose={() => setNewFile(false)} footer={<><button className="btn ghost sm" onClick={() => setNewFile(false)}>Cancel</button><button className="btn primary sm" disabled={!/^[\w\-./]+\.\w+$/.test(path)} onClick={create}>Create</button></>}>
        <Field label="Path"><input className="fi" value={path} onChange={(e) => setPath(e.target.value)} placeholder="src/utils.ts" /></Field>
      </Modal>}
    </>
  );
}

function TestsTab({ id, onRan }: { id: string; onRan: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, reload } = useAsync(() => api.tests.list({ projectId: id }), [id]);
  const run = async () => {
    setBusy(true);
    try { const r = await api.tests.run(id, 'all'); toast(`${r.passed}/${r.total} tests passed`); reload(); onRan(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h2><Icon name="flask" />Test runs<button className="btn primary sm" style={{ marginLeft: 'auto' }} disabled={busy} onClick={run}><Icon name="play" />{busy ? 'Running…' : 'Run all suites'}</button></h2>
      {data ? <RunTable runs={data} /> : <Loading />}
    </div>
  );
}

function DeployTab({ id }: { id: string }) {
  const toast = useToast();
  const [stage, setStage] = useState('DEV');
  const [method, setMethod] = useState<DeployMethod>('Docker');
  const [busy, setBusy] = useState(false);
  const { data, reload } = useAsync(() => api.deploy.environments(id), [id]);
  const go = async () => {
    setBusy(true);
    try { await api.deploy.deploy({ projectId: id, stage, method }); toast(`Deployed to ${stage}`); reload(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <div className="toolbar">
        <select className="fi auto" aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>{['DEV', 'STAGE', 'PROD'].map((s) => <option key={s}>{s}</option>)}</select>
        <select className="fi auto" aria-label="Method" value={method} onChange={(e) => setMethod(e.target.value as DeployMethod)}>{['Docker', 'Kubernetes', 'Serverless', 'Static'].map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn primary sm" disabled={busy} onClick={go}><Icon name="rocket" />{busy ? 'Deploying…' : 'Deploy'}</button>
      </div>
      {data ? <EnvTable envs={data} onChange={reload} /> : <Loading />}
    </div>
  );
}
