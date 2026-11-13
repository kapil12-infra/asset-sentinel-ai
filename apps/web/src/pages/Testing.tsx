import { useMemo, useState } from 'react';
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
  const testingCatalog = useAsync(() => api.tests.catalog(), []);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const moduleIds = useMemo(
    () => testingCatalog.data?.modules.map((module) => module.id) ?? [],
    [testingCatalog.data]
  );
  const allSelected = moduleIds.length > 0 && moduleIds.every((id) => selectedModules.includes(id));
  const toggleModule = (id: string) => {
    setSelectedModules((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );
  };
  const selectAllModules = () => setSelectedModules(moduleIds);
  const clearModuleSelection = () => setSelectedModules([]);
  const functionalCatalog = useAsync(() => api.tests.functionalCatalog(), []);
  const selected = pid || projects.data?.[0]?.id || '';

  const run = async () => {
    if (!selected) {
      toast('Create a project first');
      return;
    }

    setBusy(true);

    try {
      const r = await api.tests.run(selected, suite, selectedModules);
      toast(`QA run #${r.id} started`);
      runs.reload();

      let latest = r;

      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));

        try {
          latest = await api.tests.get(r.id);
        } catch {
          toast(`QA run #${r.id} started, but progress refresh failed`);
          return;
        }

        runs.reload();

        if (latest.status !== 'running') break;
      }

      if (latest.status === 'running') {
        toast(`QA run #${r.id} is still running`);
      } else {
        toast(`QA run #${r.id} completed: ${latest.status}`);
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      runs.reload();
    }
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
        <section style={{ marginTop: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div>
              <h2>Testing Modules</h2>
              <p style={{ color: 'var(--muted)', marginTop: 4 }}>
                Complete QA coverage across application, API, infrastructure and quality.
              </p>
            </div>
            {testingCatalog.data && (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                {testingCatalog.data.totalModules} modules · {testingCatalog.data.totalCatalogued} catalogued · {testingCatalog.data.totalPlanned} planned
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <button type="button" className="btn" onClick={allSelected ? clearModuleSelection : selectAllModules}>
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <button type="button" className="btn" onClick={clearModuleSelection}>Clear Selection</button>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{selectedModules.length} modules selected</span>
          </div>
          {testingCatalog.error ? (
            <p role="alert">Unable to load testing modules: {testingCatalog.error}</p>
          ) : !testingCatalog.data ? (
            <Loading />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {testingCatalog.data.modules.map((module) => (
                <article key={module.id} className="panel" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(module.id)}
                        onChange={() => toggleModule(module.id)}
                      />
                      Select
                    </label>
                    <strong>{module.name}</strong>
                    <span style={{ color: module.status === 'catalogued' ? 'var(--success)' : 'var(--muted)', fontSize: 11 }}>
                      {module.status === 'catalogued' ? 'Catalogued' : 'Planned'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--muted)', margin: '10px 0', fontSize: 13 }}>
                    {module.description}
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {module.subcategoryCount} categories · {module.testCaseCount} test cases
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 20, marginBottom: 20 }}>
          <h2>Choose Testing Mode</h2>
          <p style={{ color: 'var(--muted)', margin: '6px 0 14px' }}>
            Select Functional Testing or All Testing.
          </p>
          <div className="seg">
            <button
              type="button"
              className={suite === 'functional' ? 'on' : ''}
              aria-pressed={suite === 'functional'}
              onClick={() => setSuite('functional')}
            >
              <Icon name="check-c" /> Functional Testing
            </button>
            <button
              type="button"
              className={suite === 'all' ? 'on' : ''}
              aria-pressed={suite === 'all'}
              onClick={() => setSuite('all')}
            >
              <Icon name="layers" /> All Testing
            </button>
          </div>
        </section>
        {suite === 'functional' && (
          <section style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <h2>Functional Testing Catalogue</h2>
                <p style={{ color: 'var(--muted)', marginTop: 4 }}>
                  Application behaviour · Test definitions are planned until executed.
                </p>
              </div>
              {functionalCatalog.data && (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {functionalCatalog.data.totalCategories} categories · {functionalCatalog.data.totalCases} test cases
                </div>
              )}
            </div>

            {functionalCatalog.error ? (
              <p role="alert">Unable to load functional test catalogue: {functionalCatalog.error}</p>
            ) : !functionalCatalog.data ? (
              <Loading />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {functionalCatalog.data.categories.map((category) => (
                  <details key={category.id} className="panel" style={{ padding: 14 }}>
                    <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{category.name}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {category.tests.length} cases
                      </span>
                    </summary>
                    <p style={{ color: 'var(--muted)', margin: '12px 0' }}>{category.description}</p>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {category.tests.map((testCase) => (
                        <article key={testCase.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <strong>{testCase.id} · {testCase.name}</strong>
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Planned</span>
                          </div>
                          <p style={{ margin: '8px 0' }}>{testCase.objective}</p>
                          <p style={{ fontSize: 13 }}><strong>Preconditions</strong></p>
                          <ul>{testCase.preconditions.map((item, i) => <li key={i}>{item}</li>)}</ul>
                          <p style={{ fontSize: 13 }}><strong>Steps</strong></p>
                          <ol>{testCase.steps.map((item, i) => <li key={i}>{item}</li>)}</ol>
                          <p style={{ fontSize: 13, marginTop: 8 }}>
                            <strong>Expected:</strong> {testCase.expectedResult}
                          </p>
                        </article>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        )}

        <button className="btn primary" disabled={busy || selectedModules.length === 0} onClick={run}><Icon name="play" />{busy ? 'Running…' : 'Run tests'}</button>
      </div>
      <h2 className="sec">History</h2>
      <div className="panel">{runs.data ? <RunTable runs={runs.data} showProject /> : <Loading error={runs.error} />}</div>
    </>
  );
}
