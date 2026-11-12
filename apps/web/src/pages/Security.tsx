import { useState } from 'react';
import { api } from '../api/client';
import { Loading, useAsync } from '../components/ui';
import { ScanPanel } from '../components/Tables';
import { SpaAuditPanel } from '../components/SpaAudit';

type Tab = 'scan' | 'spa';

export function Security() {
  const projects = useAsync(() => api.projects.list(), []);
  const [pid, setPid] = useState('');
  const [tab, setTab] = useState<Tab>('scan');

  const selected = pid || projects.data?.[0]?.id || '';

  return (
    <>
      <div className="page-h">
        <div className="grow">
          <h1>Security</h1>
          <p>Scan for vulnerabilities, audit SPA code and track VAPT progress.</p>
        </div>
      </div>

      {!projects.data ? (
        <Loading error={projects.error} />
      ) : projects.data.length === 0 ? (
        <p className="empty">Create a project to scan it.</p>
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'scan'}
              className={tab === 'scan' ? 'on' : ''}
              onClick={() => setTab('scan')}
            >
              Vulnerability scan
            </button>

            <button
              role="tab"
              aria-selected={tab === 'spa'}
              className={tab === 'spa' ? 'on' : ''}
              onClick={() => setTab('spa')}
            >
              SPA VAPT
            </button>
          </div>

          <div className="panel">
            <div className="toolbar">
              <select
                className="fi"
                aria-label="Project"
                value={selected}
                onChange={(e) => setPid(e.target.value)}
              >
                {projects.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {tab === 'scan' ? (
              <ScanPanel key={selected} projectId={selected} />
            ) : (
              <SpaAuditPanel key={selected} projectId={selected} />
            )}
          </div>
        </>
      )}
    </>
  );
}
