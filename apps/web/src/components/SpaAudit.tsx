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
  const [mode, setMode] = useState<'source' | 'dynamic' | 'both'>('source');
  const [targetUrl, setTargetUrl] = useState('');
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);

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
      const audit = await api.security.spaAudit(projectId, {
        mode,
        ...(targetUrl.trim() ? { targetUrl: targetUrl.trim() } : {}),
        authorizationConfirmed,
      });
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

      <div className="panel">
        <h3>Assessment configuration</h3>
        <label htmlFor="spa-mode">Scan mode</label>
        <select id="spa-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="source">Source analysis (available)</option>
          <option value="dynamic">Dynamic scan (scanner not configured)</option>
          <option value="both">Source + dynamic (scanner not configured)</option>
        </select>
        <label htmlFor="spa-target">Authorized application URL (optional)</label>
        <input
          id="spa-target"
          type="url"
          placeholder="https://staging.example.com"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={authorizationConfirmed}
            onChange={(e) => setAuthorizationConfirmed(e.target.checked)}
          />
          I confirm that I am authorized to test this application.
        </label>
        <p className="muted">Dynamic modes require explicit authorization and a configured scanner. Only source analysis is currently available.</p>
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
              {result?.phases?.find((item) => item.phase === phase.id) && (
                <>
                  <p><strong>Status:</strong> {result.phases.find((item) => item.phase === phase.id)?.status}</p>
                  <small>{result.phases.find((item) => item.phase === phase.id)?.message}</small>
                </>
              )}
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

          {result.endpoints && result.endpoints.length > 0 && (
            <div>
              <h3>Discovered API endpoints ({result.endpoints.length})</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Method</th><th>Endpoint</th><th>Source file</th><th>Line</th></tr></thead>
                  <tbody>
                    {result.endpoints.map((endpoint, index) => (
                      <tr key={`${endpoint.sourceFile}:${endpoint.line}:${index}`}>
                        <td>{endpoint.method}</td>
                        <td><code>{endpoint.path}</code></td>
                        <td><code>{endpoint.sourceFile}</code></td>
                        <td>{endpoint.line}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                        <small>
                          Source: {finding.source ?? 'static'} ·
                          Confidence: {finding.confidence ?? 'unknown'} ·
                          Verified: {finding.verified ? 'Yes' : 'No'}
                        </small>
                        {finding.evidence && <pre className="code-block">{finding.evidence}</pre>}
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
