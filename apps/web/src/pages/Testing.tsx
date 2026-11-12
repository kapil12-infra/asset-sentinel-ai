import { useState } from 'react';
import type { RunSuite } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { Field, Loading, useAsync, useToast } from '../components/ui';
import { RunTable } from '../components/Tables';

const SUITES: { k: RunSuite; label: string; icon: string }[] = [
  { k: 'all', label: 'All suites', icon: 'layers' },
  { k: 'functional', label: 'Functional', icon: 'check-c' },
  { k: 'api', label: 'API', icon: 'server' },
  { k: 'automation', label: 'Automation', icon: 'cpu' },
  { k: 'regression', label: 'Regression', icon: 'refresh' },
  { k: 'performance', label: 'Performance', icon: 'gauge' },
];

export function Testing() {
  const toast = useToast();
  const projects = useAsync(() => api.projects.list(), []);
  const [pid, setPid] = useState('');
  const [suite, setSuite] = useState<RunSuite>('all');
  const [busy, setBusy] = useState(false);
  const runs = useAsync(() => api.tests.list({}), []);
  const selected = pid || projects.data?.[0]?.id || '';

  const run = async () => {
    if (!selected) { toast('Create a project first'); return; }
    setBusy(true);
    try { const r = await api.tests.run(selected, suite); toast(`${r.passed}/${r.total} tests passed`); runs.reload(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>QA Testing</h1><p>Run suites and review results.</p></div></div>
      <div className="panel">
        <div className="toolbar">
          <select className="fi" aria-label="Project" value={selected} onChange={(e) => setPid(e.target.value)}>
            {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Field label="Suite"><div className="seg">{SUITES.map((s) => <button key={s.k} className={suite === s.k ? 'on' : ''} aria-pressed={suite === s.k} onClick={() => setSuite(s.k)}><Icon name={s.icon} />{s.label}</button>)}</div></Field>
        <button className="btn primary" disabled={busy} onClick={run}><Icon name="play" />{busy ? 'Running…' : 'Run tests'}</button>
      </div>
      <h2 className="sec">History</h2>
      <div className="panel">{runs.data ? <RunTable runs={runs.data} showProject /> : <Loading error={runs.error} />}</div>
    </>
  );
}
