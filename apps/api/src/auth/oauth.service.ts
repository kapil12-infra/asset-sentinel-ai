import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

interface Profile {
  email: string;
  name: string;
}

/** Google and GitHub sign-in. Only active when the client id and secret are set. */
@Injectable()
export class OAuthService {
  constructor(
    private jwt: JwtService,
    private auth: AuthService,
  ) {}

  private config(provider: string): { id: string; secret: string } {
    let id: string | undefined;
    let secret: string | undefined;
    if (provider === 'github') {
      id = process.env.GITHUB_CLIENT_ID;
      secret = process.env.GITHUB_CLIENT_SECRET;
    } else if (provider === 'google') {
      id = process.env.GOOGLE_CLIENT_ID;
      secret = process.env.GOOGLE_CLIENT_SECRET;
    } else {
      throw new NotFoundException('Unknown sign-in provider');
    }
    if (!id || !secret) throw new NotImplementedException(`${provider} sign-in is not configured`);
    return { id, secret };
  }

  private redirectUri(provider: string): string {
    const api = process.env.API_URL || 'http://localhost:3000';
    return `${api}/api/auth/oauth/${provider}/callback`;
  }

  async authorizeUrl(provider: string): Promise<string> {
    const { id } = this.config(provider);
    const state = await this.jwt.signAsync({ k: 'oauth', p: provider }, { expiresIn: '10m' });
    if (provider === 'github') {
      const q = new URLSearchParams({
        client_id: id,
        redirect_uri: this.redirectUri(provider),
        scope: 'user:email',
        state,
      });
      return `https://github.com/login/oauth/authorize?${q}`;
    }
    const q = new URLSearchParams({
      client_id: id,
      redirect_uri: this.redirectUri(provider),
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }

  /** Always returns a URL on the web app, with either ?token= or ?error=. */
  async handleCallback(
    provider: string,
    code?: string,
    state?: string,
    error?: string,
  ): Promise<string> {
    const web = (process.env.WEB_URL || 'http://localhost:5173').split(',')[0];
    const fail = (m: string) => `${web}/oauth/callback?error=${encodeURIComponent(m)}`;
    try {
      if (error) return fail(error);
      if (!code || !state) return fail('Missing authorization code');
      const s = await this.jwt.verifyAsync<{ k: string; p: string }>(state);
      if (s.k !== 'oauth' || s.p !== provider) return fail('Invalid state');
      const profile = provider === 'github' ? await this.github(code) : await this.google(code);
      const user = await this.auth.upsertOAuthUser(profile.email, profile.name, provider);
      return `${web}/oauth/callback?token=${encodeURIComponent(await this.auth.sign(user))}`;
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Sign-in failed');
    }
  }

  private async github(code: string): Promise<Profile> {
    const { id, secret } = this.config('github');
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: id,
        client_secret: secret,
        code,
        redirect_uri: this.redirectUri('github'),
      }),
    });
    const t = (await tokenRes.json()) as { access_token?: string; error_description?: string };
    if (!t.access_token) throw new Error(t.error_description || 'GitHub token exchange failed');

    const headers = {
      authorization: `Bearer ${t.access_token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'asset-sentinel-ai',
    };
    const u = (await (await fetch('https://api.github.com/user', { headers })).json()) as {
      name?: string | null;
      login: string;
      email?: string | null;
    };
    let email = u.email ?? null;
    if (!email) {
      const list = (await (
        await fetch('https://api.github.com/user/emails', { headers })
      ).json()) as { email: string; primary: boolean; verified: boolean }[];
      email = list.find((e) => e.primary && e.verified)?.email ?? null;
    }
    if (!email) throw new Error('No verified email on this GitHub account');
    return { email, name: u.name || u.login };
  }

  private async google(code: string): Promise<Profile> {
    const { id, secret } = this.config('google');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: id,
        client_secret: secret,
        redirect_uri: this.redirectUri('google'),
        grant_type: 'authorization_code',
      }),
    });
    const t = (await tokenRes.json()) as { access_token?: string; error_description?: string };
    if (!t.access_token) throw new Error(t.error_description || 'Google token exchange failed');

    const info = (await (
      await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { authorization: `Bearer ${t.access_token}` },
      })
    ).json()) as { email?: string; email_verified?: boolean; name?: string };
    if (!info.email || info.email_verified === false) {
      throw new Error('No verified email on this Google account');
    }
    return { email: info.email, name: info.name || info.email.split('@')[0] };
  }
}
