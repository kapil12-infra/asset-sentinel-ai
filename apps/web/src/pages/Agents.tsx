import { useState } from 'react';
import type { Agent } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { Field, Loading, Modal, useAsync, useToast } from '../components/ui';

export function Agents() {
  const toast = useToast();
  const { data, error, reload } = useAsync(() => api.agents.list(), []);
  const [run, setRun] = useState<Agent | null>(null);
  const [task, setTask] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const exec = async () => {
    if (!run) return;
    setBusy(true); setOutput('');
    try { setOutput((await api.agents.run(run.id, task || undefined)).output); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const create = async () => {
    try { await api.agents.create(name, desc); setAdding(false); setName(''); setDesc(''); reload(); toast('Agent created'); } catch (e) { toast((e as Error).message); }
  };
  const close = () => { setRun(null); setTask(''); setOutput(''); };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>AI Agents</h1><p>Specialised assistants for each stage of delivery.</p></div><button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" />New agent</button></div>
      <div className="panel">
        {!data ? <Loading error={error} /> : data.map((a) => (
          <button className="agent" key={a.id} onClick={() => setRun(a)}>
            <span className="ai"><Icon name={a.icon} /></span><div><b>{a.name}</b><small>{a.description}</small></div><span className="go"><Icon name="right" /></span>
          </button>
        ))}
      </div>
      {run && (
        <Modal wide title={run.name} onClose={close} footer={<><button className="btn ghost sm" onClick={close}>Close</button><button className="btn primary sm" disabled={busy} onClick={exec}><Icon name="play" />{busy ? 'Running…' : 'Run'}</button></>}>
          <Field label="Task (optional)"><textarea className="fi" maxLength={1000} value={task} onChange={(e) => setTask(e.target.value)} placeholder="Review the login flow" /></Field>
          {output && <pre className="log" style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>}
        </Modal>
      )}
      {adding && (
        <Modal title="New agent" onClose={() => setAdding(false)} footer={<><button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary sm" disabled={name.trim().length < 2 || desc.trim().length < 8} onClick={create}>Create</button></>}>
          <Field label="Name"><input className="fi" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="What does it do? (min 8 characters)"><textarea className="fi" maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
