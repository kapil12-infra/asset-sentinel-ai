import { useState } from 'react';
import type { SpaAudit as SpaAuditResult, SpaChecklistItem, SpaPhase } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Icon } from './icons';

const PHASES: { id: SpaPhase; title: string; description: string }[] = [
  { id: 1, title: 'Client reconnaissance and source mapping', description: 'Review routes, bundles, source maps and exposed client configuration.' },
  { id: 2, title: 'Dynamic crawling and traffic interception', description: 'Plan browser crawling and inspect client-side network traffic.' },
  { id: 3, title: 'Client-side vulnerability assessment', description: 'Review DOM sinks, browser storage, authorization assumptions and client logic.' },
  { id: 4, title: 'Backend API security testing', description: 'Review API authorization patterns, CORS, mass assignment and GraphQL configuration.' },
];

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export function SpaAuditPanel({ projectId }: { projectId: string }) {
  const [checklist, setChecklist] = useState<SpaChecklistItem[] | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [result, setResult] = useState<SpaAuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadChecklist() {
    try {
      const items = await api.security.spaChecklist();
      setChecklist(items);
      setChecklistError(null);
    } catch (e) {
      setChecklistError(e instanceof Error ? e.message : 'Could not load checklist');
    }
  }

  async function runAudit() {
    setRunning(true);
    setError(null);
    try {
      const audit = await api.security.spaAudit(projectId);
      setResult(audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SPA audit failed');
    } finally {
      setRunning(false);
    }
  }

  const findings = result?.findings ?? [];

  return (
    <section className="spa-audit">
      <div className="toolbar">
        <div className="grow">
          <h2>SPA VAPT assessment</h2>
          <p className="muted">Static source-code checks across four assessment phases.</p>
        </div>
        <button className="btn ghost sm" onClick={loadChecklist}>
          <Icon name="list" /> Load checklist
        </button>
        <button className="btn primary sm" onClick={runAudit} disabled={running || !projectId}>
          <Icon name="shield" /> {running ? 'Auditing…' : 'Run SPA VAPT'}
        </button>
      </div>

      <div className="grid-cards">
        {PHASES.map((phase) => {
          const count = findings.filter((f) => f.phase === phase.id).length;
          return (
            <article className="panel" key={phase.id}>
              <small>PHASE {phase.id}</small>
              <h3>{phase.title}</h3>
              <p>{phase.description}</p>
              <strong>{result ? `${count} finding${count === 1 ? '' : 's'}` : 'Not run yet'}</strong>
            </article>
          );
        })}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="panel">
          <div className="toolbar">
            <div className="grow">
              <h3>Audit results</h3>
              <p className="muted">
                {result.filesScanned} files scanned · {new Date(result.at).toLocaleString()}
              </p>
            </div>
            <strong>{findings.length} findings</strong>
          </div>

          <div className="toolbar">
            {SEVERITIES.map((severity) => (
              <span className={`sev ${severity}`} key={severity}>
                {severity}: {findings.filter((f) => f.severity === severity).length}
              </span>
            ))}
          </div>

          {findings.length === 0 ? (
            <p className="empty">No findings from the configured static checks. This is not proof that the application is secure.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Phase</th>
                    <th>Check</th>
                    <th>Location</th>
                    <th>Finding and remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((finding) => (
                    <tr key={finding.id}>
                      <td><span className={`sev ${finding.severity}`}>{finding.severity}</span></td>
                      <td>{finding.phase}</td>
                      <td>{finding.check}</td>
                      <td><code>{finding.location}</code></td>
                      <td>
                        <p>{finding.detail}</p>
                        <small><strong>Fix:</strong> {finding.fix}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h3>SPA VAPT checklist</h3>
        {checklistError && <p className="error" role="alert">{checklistError}</p>}
        {checklist === null ? (
          <p className="muted">Select Load checklist to view the assessment activities.</p>
        ) : checklist.length === 0 ? (
          <p className="empty">No checklist items returned by the API.</p>
        ) : (
          PHASES.map((phase) => (
            <div key={phase.id}>
              <h4>Phase {phase.id}: {phase.title}</h4>
              {checklist.filter((item) => item.phase === phase.id).map((item) => (
                <div className="prefrow" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.tool} · {item.automated ? 'Automated check' : 'Manual validation'}</small>
                    <small>{item.how}</small>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <p className="muted">
        Scope note: this audit analyzes saved project source files using static heuristics.
        It does not launch a browser, crawl a deployed application, intercept live traffic,
        or prove exploitability. Complete the manual and dynamic checklist before signing off VAPT.
      </p>
    </section>
  );
}
