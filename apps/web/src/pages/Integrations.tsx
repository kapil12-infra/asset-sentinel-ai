import { useState } from 'react';
import type { Integration } from '@asset-sentinel/shared';
import { api } from '../api/client';
import { Field, Loading, Modal, useAsync, useToast } from '../components/ui';

export function Integrations() {
  const toast = useToast();
  const { data, error, reload } = useAsync(() => api.integrations.list(), []);
  const [target, setTarget] = useState<Integration | null>(null);
  const [token, setToken] = useState('');

  const connect = async () => {
    if (!target) return;
    try { await api.integrations.connect(target.id, token); toast(`${target.name} connected`); setTarget(null); setToken(''); reload(); } catch (e) { toast((e as Error).message); }
  };
  const click = async (i: Integration) => {
    if (!i.connected) { setTarget(i); return; }
    try { await api.integrations.disconnect(i.id); toast(`${i.name} disconnected`); reload(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="page-h"><div className="grow"><h1>Integrations</h1><p>Tokens are encrypted at rest.</p></div></div>
      {!data ? <Loading error={error} /> : (
        <div className="cards">{data.map((i) => (
          <div className="integ" key={i.id}>
            <span className="lg">{i.name.slice(0, 2)}</span><b>{i.name}</b>
            <button className={`cb${i.connected ? ' on' : ''}`} onClick={() => click(i)}>{i.connected ? 'Connected · Disconnect' : 'Connect'}</button>
          </div>
        ))}</div>
      )}
      {target && (
        <Modal title={`Connect ${target.name}`} onClose={() => setTarget(null)} footer={<><button className="btn ghost sm" onClick={() => setTarget(null)}>Cancel</button><button className="btn primary sm" disabled={token.length < 6} onClick={connect}>Connect</button></>}>
          <Field label="Access token (min 6 characters)"><input className="fi" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
