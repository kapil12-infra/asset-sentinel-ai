import { useState } from 'react';
import { api } from '../api/client';
import { EnvTable } from '../components/Tables';
import { Field, Loading, Modal, useAsync, useToast } from '../components/ui';
import { Icon } from '../components/icons';

export function Environments() {
  const toast = useToast();
  const projects = useAsync(() => api.projects.list(), []);
  const envs = useAsync(() => api.deploy.environments(), []);
  const [adding, setAdding] = useState(false);
  const [pid, setPid] = useState('');
  const [stage, setStage] = useState('');
  const selected = pid || projects.data?.[0]?.id || '';

  const create = async () => {
    try { await api.deploy.createEnv(selected, stage.toUpperCase()); setAdding(false); setStage(''); envs.reload(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>Environments</h1><p>Start, stop and manage every environment.</p></div>
        <button className="btn primary" onClick={() => setAdding(true)} disabled={!projects.data?.length}><Icon name="plus" />Add environment</button></div>
      <div className="panel">{envs.data ? <EnvTable showProject envs={envs.data} onChange={envs.reload} /> : <Loading error={envs.error} />}</div>
      {adding && (
        <Modal title="Add environment" onClose={() => setAdding(false)} footer={<><button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary sm" disabled={!/^[A-Za-z0-9_-]{1,12}$/.test(stage)} onClick={create}>Create</button></>}>
          <Field label="Project"><select className="fi" value={selected} onChange={(e) => setPid(e.target.value)}>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Stage (A-Z, 0-9, _ -, max 12)"><input className="fi" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="QA" /></Field>
        </Modal>
      )}
    </>
  );
}
