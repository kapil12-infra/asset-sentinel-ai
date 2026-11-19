import { useEffect, useState } from 'react';
import type { MonitoringRange } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { LineChart, Loading, useAsync } from '../components/ui';

export function Monitoring() {
  const [range, setRange] = useState<MonitoringRange>('1h');
  const { data, error, reload } = useAsync(() => api.monitoring.get(range), [range]);
  useEffect(() => { const t = window.setInterval(reload, 15000); return () => window.clearInterval(t); }, [reload]);

  return (
    <>
      <div className="page-h">
        <div className="grow"><h1>Monitoring</h1><p><span className="mon-live">Live</span> · real request and process metrics from this API</p></div>
        <div className="seg">{(['1h', '24h', '7d'] as MonitoringRange[]).map((r) => <button key={r} className={range === r ? 'on' : ''} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}</div>
      </div>
      {!data ? <Loading error={error} /> : (
        <>
          <div className="grid g4">
            <div className="kpi okc"><b>{data.uptime}%</b><span>Success rate</span></div>
            <div className="kpi infoc"><b>{data.responseMs}ms</b><span>Avg response</span></div>
            <div className="kpi warnc"><b>{data.cpu}%</b><span>CPU</span></div>
            <div className="kpi"><b>{data.memory}%</b><span>Memory</span></div>
          </div>
          <div className="panel" style={{ marginTop: 12 }}>
            <h2>Response time (ms)</h2>
            <LineChart data={data.series} unit="" />
          </div>
        </>
      )}
    </>
  );
}
