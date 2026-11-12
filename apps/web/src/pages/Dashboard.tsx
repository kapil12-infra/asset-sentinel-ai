import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from '../components/icons';
import { LineChart, Loading, StatusChip, timeAgo, useAsync } from '../components/ui';

const ACT_ICON: Record<string, string> = { ok: 'check-c', flask: 'flask', cloud: 'cloud', shield: 'shield', bolt: 'bolt' };

export function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data, error } = useAsync(() => api.dashboard.summary(), []);
  if (!data) return <Loading error={error} />;

  const stats = [
    { label: 'Projects', value: data.projects, icon: 'layers', to: '/projects' },
    { label: 'Tests executed', value: data.testsExecuted, icon: 'flask', to: '/qa' },
    { label: 'Bugs found', value: data.bugsFound, icon: 'bug', to: '/qa' },
    { label: 'Critical issues', value: data.criticalIssues, icon: 'shield', to: '/security' },
    { label: 'Deployed apps', value: data.deployedApps, icon: 'rocket', to: '/deploy' },
  ];

  return (
    <>
      <section className="hero">
        <div>
          <h1>Build. Test. Secure. <em>Deploy.</em></h1>
          <p>Welcome back, {user?.name.split(' ')[0]}. Describe an app and let Asset Sentinel generate, test and ship it.</p>
          <div className="cta">
            <button className="btn primary" onClick={() => nav('/build')}><Icon name="sparkle" />Build an app</button>
            <button className="btn ghost" onClick={() => nav('/projects')}><Icon name="layers" />View projects</button>
          </div>
        </div>
        <div className="robot" />
        <div className="checks">
          {['Generate code', 'Run QA suites', 'Scan for issues', 'Deploy anywhere'].map((c) => (
            <div key={c}><span className="ok"><Icon name="check" /></span>{c}</div>
          ))}
        </div>
      </section>

      <div className="stats">
        {stats.map((s) => (
          <button key={s.label} className="stat" onClick={() => nav(s.to)}>
            <span className="ic" style={{ background: '#1a2150', color: '#a855f7' }}><Icon name={s.icon} /></span>
            <div><b>{s.value.toLocaleString()}</b><span>{s.label}</span></div>
          </button>
        ))}
      </div>

      <div className="grid g2">
        <div className="panel">
          <h2><Icon name="layers" />Recent projects<span className="lnk" onClick={() => nav('/projects')}>View all<Icon name="right" /></span></h2>
          {data.recentProjects.length === 0 ? <p className="empty">Nothing tested yet. Run tests on a project to see it here.</p> : (
            <div className="tw"><table><thead><tr><th>Project</th><th>Status</th><th>Last run</th></tr></thead><tbody>
              {data.recentProjects.map((p) => (
                <tr key={p.id}>
                  <td><button className="proj" onClick={() => nav(`/projects/${p.id}`)}><span className="pi" style={{ background: '#1a2150' }}><Icon name="folder" /></span><span><b>{p.name}</b><small>{p.sub}</small></span></button></td>
                  <td><StatusChip status={p.status} /></td>
                  <td>{timeAgo(p.lastRun)}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="panel">
          <h2><Icon name="bolt" />Quick actions</h2>
          <div className="quick">
            {[
              { t: 'New app', s: 'Generate from a prompt', i: 'sparkle', to: '/build' },
              { t: 'Run tests', s: 'Open QA testing', i: 'flask', to: '/qa' },
              { t: 'Security scan', s: 'Find and fix issues', i: 'shield', to: '/security' },
              { t: 'Deploy', s: 'Ship to an environment', i: 'rocket', to: '/deploy' },
            ].map((q) => (
              <button key={q.t} onClick={() => nav(q.to)}>
                <span className="qi"><Icon name={q.i} /></span><div><b>{q.t}</b><small>{q.s}</small></div>
                <span className="go"><Icon name="right" /></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g3">
        <div className="panel">
          <h2><Icon name="chart" />Tests this week</h2>
          <div className="trend-wrap">
            <LineChart data={data.trend.map((t) => ({ label: t.date, value: t.tests }))} />
            <div className="mini">
              <div><span className="ok"><Icon name="check" /></span><span><b>{data.passRate}%</b><span>Pass rate</span></span></div>
              <div><span><b>{data.testsExecuted}</b><span>Total tests</span></span></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <h2><Icon name="pulse" />Recent activity</h2>
          {data.activity.length === 0 ? <p className="empty">No activity yet.</p> : (
            <div className="activity">
              {data.activity.slice(0, 6).map((a) => (
                <div className="act" key={a.id}><span className="ai" style={{ background: '#1a2150' }}><Icon name={ACT_ICON[a.type] ?? 'bolt'} /></span><span>{a.text}</span><time>{timeAgo(a.at)}</time></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
