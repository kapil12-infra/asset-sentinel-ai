import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const c = new CryptoService();

  it('round-trips encrypted text', () => {
    const enc = c.encrypt('ghp_secret_token');
    expect(enc).not.toContain('ghp_secret_token');
    expect(c.decrypt(enc)).toBe('ghp_secret_token');
  });

  it('uses a fresh IV each time', () => {
    expect(c.encrypt('x')).not.toBe(c.encrypt('x'));
  });

  it('rejects tampered ciphertext', () => {
    const [iv, tag, data] = c.encrypt('hello').split('.');
    const bad = [iv, tag, Buffer.from('zzzzz').toString('base64')].join('.');
    expect(() => c.decrypt(bad)).toThrow();
    expect(data).toBeTruthy();
  });

  it('hashes deterministically with sha256', () => {
    expect(c.sha256('a')).toBe(c.sha256('a'));
    expect(c.sha256('a')).toHaveLength(64);
  });
});
