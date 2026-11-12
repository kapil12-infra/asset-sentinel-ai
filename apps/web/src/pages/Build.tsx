import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProjectType } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { Field, ProgressModal, useStepper, useToast } from '../components/ui';

const TYPES: { t: ProjectType; icon: string; sub: string }[] = [
  { t: 'Web App', icon: 'monitor', sub: 'React + Vite' },
  { t: 'API', icon: 'server', sub: 'Node + Express' },
  { t: 'Mobile', icon: 'phone', sub: 'React Native' },
  { t: 'Full Stack', icon: 'layers', sub: 'React + Node + Postgres' },
  { t: 'Platform', icon: 'building', sub: 'Microservices + Docker' },
];
const STEPS = ['Understanding your request', 'Scaffolding the project', 'Generating source files', 'Running automation', 'Finalizing'];

export function Build() {
  const nav = useNavigate();
  const toast = useToast();
  const [type, setType] = useState<ProjectType>('Web App');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const step = useStepper(STEPS.length, busy, 1500);

  const submit = async () => {
    if (prompt.trim().length < 12) { toast('Describe your app in at least 12 characters'); return; }
    setBusy(true);
    try {
      const p = await api.projects.generate({ prompt: prompt.trim(), name: name.trim() || undefined, type });
      toast(`${p.name} is ready`);
      nav(`/projects/${p.id}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>App Builder</h1><p>Describe what you want. Asset Sentinel generates the code.</p></div></div>
      <div className="panel">
        <Field label="Project type">
          <div className="seg">
            {TYPES.map((x) => (
              <button key={x.t} className={type === x.t ? 'on' : ''} onClick={() => setType(x.t)} aria-pressed={type === x.t}><Icon name={x.icon} />{x.t}</button>
            ))}
          </div>
        </Field>
        <Field label="Name (optional)"><input className="fi" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Inventory Tracker" /></Field>
        <Field label="What should it do?"><textarea className="fi" value={prompt} maxLength={1000} onChange={(e) => setPrompt(e.target.value)} placeholder="A dashboard that tracks warehouse inventory with low-stock alerts" /></Field>
        <button className="btn primary" onClick={submit} disabled={busy}><Icon name="sparkle" />Generate</button>
      </div>
      {busy && <ProgressModal title="Building your app" steps={STEPS} active={step} />}
    </>
  );
}
