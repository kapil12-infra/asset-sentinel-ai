import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** AES-256-GCM for integration tokens, SHA-256 for API key hashes. */
@Injectable()
export class CryptoService {
  private get key(): Buffer {
    const k = process.env.SECRETS_KEY;
    if (k && /^[0-9a-fA-F]{64}$/.test(k)) return Buffer.from(k, 'hex');
    return createHash('sha256')
      .update(process.env.JWT_SECRET || 'dev-secret-change-me')
      .digest();
  }

  encrypt(text: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
  }

  decrypt(payload: string): string {
    const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
