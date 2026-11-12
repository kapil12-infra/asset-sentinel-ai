import { useState } from 'react';
import type { DeployMethod } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { Field, Loading, Modal, useAsync, useToast } from '../components/ui';
import { EnvTable } from '../components/Tables';

const METHODS: DeployMethod[] = ['Docker', 'Kubernetes', 'Serverless', 'Static'];

export function Deploy() {
  const toast = useToast();
  const projects = useAsync(() => api.projects.list(), []);
  const envs = useAsync(() => api.deploy.environments(), []);
  const [pid, setPid] = useState('');
  const [stage, setStage] = useState('DEV');
  const [method, setMethod] = useState<DeployMethod>('Docker');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState('');
  const selected = pid || projects.data?.[0]?.id || '';

  const deploy = async () => {
    if (!selected) { toast('Create a project first'); return; }
    setBusy(true);
    try { await api.deploy.deploy({ projectId: selected, stage, method }); toast(`Deployed to ${stage}`); envs.reload(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const addEnv = async () => {
    try { await api.deploy.createEnv(selected, newStage.toUpperCase()); setAdding(false); setNewStage(''); envs.reload(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>Deploy</h1><p>Ship a project to an environment.</p></div></div>
      <div className="panel">
        <div className="toolbar">
          <select className="fi" aria-label="Project" value={selected} onChange={(e) => setPid(e.target.value)}>
            {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Field label="Stage"><div className="cards c3">
          {['DEV', 'STAGE', 'PROD'].map((s) => <button key={s} className={`env-card${stage === s ? ' on' : ''}`} onClick={() => setStage(s)} aria-pressed={stage === s}><b>{s}</b><small>{s === 'DEV' ? 'develop branch' : s === 'STAGE' ? 'release candidate' : 'main branch'}</small></button>)}
        </div></Field>
        <Field label="Method"><div className="seg">{METHODS.map((m) => <button key={m} className={method === m ? 'on' : ''} aria-pressed={method === m} onClick={() => setMethod(m)}>{m}</button>)}</div></Field>
        <button className="btn primary" disabled={busy} onClick={deploy}><Icon name="rocket" />{busy ? 'Deploying…' : 'Deploy'}</button>
      </div>
      <h2 className="sec">Environments</h2>
      <div className="panel">
        <div className="toolbar"><button className="btn ghost sm" onClick={() => setAdding(true)}><Icon name="plus" />Add environment</button></div>
        {envs.data ? <EnvTable showProject envs={envs.data} onChange={envs.reload} /> : <Loading error={envs.error} />}
      </div>
      {adding && <Modal title="Add environment" onClose={() => setAdding(false)} footer={<><button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary sm" disabled={!/^[A-Za-z0-9_-]{1,12}$/.test(newStage)} onClick={addEnv}>Create</button></>}>
        <Field label="Stage name (A-Z, 0-9, _ -, max 12)"><input className="fi" value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="QA" /></Field>
      </Modal>}
    </>
  );
}
