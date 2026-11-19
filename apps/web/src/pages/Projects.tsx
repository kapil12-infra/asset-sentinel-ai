import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from '../components/icons';
import { ConfirmModal, Loading, StatusChip, timeAgo, useAsync, useToast } from '../components/ui';

export function Projects() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [del, setDel] = useState<Project | null>(null);
  const { data, error, reload } = useAsync(() => api.projects.list(q, status), [q, status]);

  const clone = async (p: Project) => {
    try { await api.projects.clone(p.id); toast(`Cloned ${p.name}`); reload(); } catch (e) { toast((e as Error).message); }
  };
  const run = async (p: Project) => {
    toast(`Running tests on ${p.name}…`);
    try { const r = await api.tests.run(p.id, 'all'); toast(`${r.passed}/${r.total} tests passed`); reload(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="page-h">
        <div className="grow"><h1>Projects</h1><p>All the apps you have generated.</p></div>
        <button className="btn primary" onClick={() => nav('/build')}><Icon name="plus" />New project</button>
      </div>
      <div className="toolbar">
        <input className="fi" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="fi auto" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="pass">Passed</option><option value="warn">Needs attention</option><option value="none">Not tested</option>
        </select>
      </div>
      <div className="panel">
        {!data ? <Loading error={error} /> : data.length === 0 ? <p className="empty">No projects found.</p> : (
          <div className="tw"><table>
            <thead><tr><th>Project</th><th className="hide-m">Type</th><th>Status</th><th className="hide-m">Last run</th><th /></tr></thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td><button className="proj" onClick={() => nav(`/projects/${p.id}`)}><span className="pi" style={{ background: '#1a2150' }}><Icon name="folder" /></span><span><b>{p.name}</b><small>{p.sub}</small></span></button></td>
                  <td className="hide-m">{p.type}</td>
                  <td><StatusChip status={p.status} /></td>
                  <td className="hide-m">{timeAgo(p.lastRun)}</td>
                  <td><div className="acts">
                    <button className="run-btn" aria-label={`Run tests on ${p.name}`} onClick={() => run(p)}><Icon name="play" /></button>
                    <button className="more" aria-label={`Clone ${p.name}`} onClick={() => clone(p)}><Icon name="copy" /></button>
                    <button className="more" aria-label={`Delete ${p.name}`} onClick={() => setDel(p)}><Icon name="trash" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {del && (
        <ConfirmModal
          title="Delete project" danger confirmLabel="Delete"
          text={`Delete ${del.name} and all of its files, tests and environments? This cannot be undone.`}
          onClose={() => setDel(null)}
          onConfirm={async () => { await api.projects.remove(del.id); toast('Project deleted'); reload(); }}
        />
      )}
    </>
  );
}
