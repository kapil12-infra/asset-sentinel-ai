import { useState } from 'react';
import type { Environment, Scan, TestRun, TestRunSummary } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from './icons';
import { Loading, Modal, timeAgo, useAsync, useToast } from './ui';

export function RunTable({ runs, showProject }: { runs: TestRunSummary[]; showProject?: boolean }) {
  const toast = useToast();
  const [detail, setDetail] = useState<TestRun | null>(null);
  const open = async (id: number) => { try { setDetail(await api.tests.get(id)); } catch (e) { toast((e as Error).message); } };
  if (!runs.length) return <p className="empty">No test runs yet.</p>;
  return (
    <>
      <div className="tw"><table>
        <thead><tr><th>Run</th>{showProject && <th>Project</th>}<th>Suite</th><th>Result</th><th className="hide-m">Duration</th><th>When</th></tr></thead>
        <tbody>{runs.map((r) => (
          <tr key={r.id}>
            <td><button className="lnk" onClick={() => open(r.id)} style={{ color: 'var(--violet-2)' }}>#{r.id}</button></td>
            {showProject && <td>{r.projectName}</td>}
            <td>{r.suite}</td>
            <td><span className={`status ${r.status === 'pass' ? 'pass' : 'fail'}`}>{r.passed}/{r.total} passed</span></td>
            <td className="hide-m">{r.durationSec}s</td>
            <td>{timeAgo(r.startedAt)}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {detail && (
        <Modal wide title={`Run #${detail.id} · ${detail.projectName}`} onClose={() => setDetail(null)}
          footer={<button className="btn primary sm" onClick={async () => { try { const n = await api.tests.rerun(detail.id); setDetail(n); toast('Re-run complete'); } catch (e) { toast((e as Error).message); } }}><Icon name="refresh" />Re-run</button>}>
          <div className="grid g4" style={{ marginBottom: 12 }}>
            <div className="kpi infoc"><b>{detail.total}</b><span>Total</span></div>
            <div className="kpi okc"><b>{detail.passed}</b><span>Passed</span></div>
            <div className="kpi badc"><b>{detail.failed}</b><span>Failed</span></div>
            <div className="kpi"><b>{detail.durationSec}s</b><span>Duration</span></div>
          </div>
          <div className="tw"><table><thead><tr><th>Test</th><th>Result</th><th>Time</th></tr></thead><tbody>
            {detail.cases.map((c, i) => (
              <tr key={i}><td>{c.name}<small style={{ display: 'block', color: 'var(--muted)' }}>{c.suite}{c.error ? ` · ${c.error}` : ''}</small></td>
                <td><span className={`status ${c.result === 'Passed' ? 'pass' : 'fail'}`}>{c.result}</span></td><td>{c.duration}</td></tr>
            ))}
          </tbody></table></div>
          <h3 className="sec">Log</h3>
          <pre className="log">{detail.logs.join('\n')}</pre>
        </Modal>
      )}
    </>
  );
}

export function ScanPanel({ projectId, onChange }: { projectId: string; onChange?: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, loading, setData } = useAsync(() => api.security.get(projectId), [projectId]);

  const act = async (fn: () => Promise<Scan | null>, msg: string) => {
    setBusy(true);
    try { setData(await fn()); toast(msg); onChange?.(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const scan = () => act(() => api.security.scan(projectId), 'Scan complete');
  const fixAll = () => act(async () => { await api.security.fixAll(projectId); return api.security.get(projectId); }, 'All issues fixed');
  const fixOne = (id: string) => act(async () => { await api.security.fix(id); return api.security.get(projectId); }, 'Issue fixed');

  if (loading) return <Loading />;
  const open = data?.vulnerabilities.filter((v) => !v.fixed) ?? [];
  const counts = (['Critical', 'High', 'Medium', 'Low'] as const).map((s) => ({ s, n: open.filter((v) => v.severity === s).length }));

  return (
    <>
      <div className="toolbar">
        <button className="btn primary sm" disabled={busy} onClick={scan}><Icon name="shield" />{busy ? 'Working…' : data ? 'Re-scan' : 'Run scan'}</button>
        {open.length > 0 && <button className="btn ghost sm" disabled={busy} onClick={fixAll}><Icon name="bolt" />Fix all ({open.length})</button>}
      </div>
      {!data ? <p className="empty">This project has not been scanned yet.</p> : (
        <>
          <div className="grid g4" style={{ marginBottom: 12 }}>
            {counts.map((c) => <div key={c.s} className={`kpi ${c.s === 'Critical' ? 'badc' : c.s === 'High' ? 'warnc' : c.s === 'Medium' ? 'infoc' : ''}`}><b>{c.n}</b><span>{c.s}</span></div>)}
          </div>
          {data.vulnerabilities.length === 0 ? <p className="empty">No findings.</p> : data.vulnerabilities.map((v) => (
            <div className="rec" key={v.id}>
              <span className={`sev ${v.severity}`}>{v.severity}</span>
              <div><b>{v.name}</b><small>{v.location} · Fix: {v.fix}</small></div>
              {v.fixed ? <span className="status pass"><Icon name="check" />Fixed</span> : <button className="btn ghost sm" disabled={busy} onClick={() => fixOne(v.id)}>Fix</button>}
            </div>
          ))}
        </>
      )}
    </>
  );
}

export function EnvTable({ envs, onChange, showProject }: { envs: Environment[]; onChange: () => void; showProject?: boolean }) {
  const toast = useToast();
  if (!envs.length) return <p className="empty">No environments yet. Deploy to create one.</p>;
  const toggle = async (e: Environment) => { try { await api.deploy.toggle(e.id); onChange(); } catch (x) { toast((x as Error).message); } };
  const remove = async (e: Environment) => { try { await api.deploy.removeEnv(e.id); toast('Environment removed'); onChange(); } catch (x) { toast((x as Error).message); } };
  return (
    <div className="tw"><table>
      <thead><tr>{showProject && <th>Project</th>}<th>Stage</th><th>URL</th><th>Status</th><th className="hide-m">Deployed</th><th /></tr></thead>
      <tbody>{envs.map((e) => (
        <tr key={e.id}>
          {showProject && <td>{e.projectName}</td>}
          <td><b>{e.stage}</b></td>
          <td><a href={e.url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--violet-2)' }}>{e.url}</a></td>
          <td><span className={`status ${e.status === 'Running' ? 'pass' : e.status === 'Deploying' ? 'run' : 'none'}`}>{e.status}</span></td>
          <td className="hide-m">{timeAgo(e.lastDeployAt)}</td>
          <td><div className="acts">
            <button className="more" aria-label={e.status === 'Running' ? 'Stop' : 'Start'} onClick={() => toggle(e)}><Icon name={e.status === 'Running' ? 'x' : 'play'} /></button>
            <button className="more" aria-label="Remove environment" onClick={() => remove(e)}><Icon name="trash" /></button>
          </div></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}
