import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface SpaScannerRequest {
  target_url: string;
  authorization_confirmed: boolean;
  max_pages?: number;
}

export interface SpaScannerResult {
  target: string;
  pages_scanned: number;
  pages: Array<{
    url: string;
    title: string;
    forms: Array<{
      action: string;
      method: string;
    }>;
    storage: {
      localStorageKeys: string[];
      sessionStorageKeys: string[];
    };
  }>;
  endpoints: Array<{
    url: string;
    method: string;
    status: number;
  }>;
  findings: unknown[];
  errors: Array<{
    url: string;
    error: string;
  }>;
  blocked_requests: string[];
  timed_out: boolean;
  scope: string;
}

@Injectable()
export class SpaScannerClient {
  private readonly baseUrl =
    process.env.SPA_SCANNER_URL || 'http://spa-scanner:8090';

  private readonly token =
    process.env.SPA_SCANNER_TOKEN || '';

  async scan(
    request: SpaScannerRequest,
  ): Promise<SpaScannerResult> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'SPA scanner authentication is not configured.',
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Scanner-Token': this.token,
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(100_000),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Scanner returned HTTP ${response.status}.`,
        );
      }

      return (await response.json()) as SpaScannerResult;
    } catch {
      throw new ServiceUnavailableException(
        'SPA scanner is unavailable or the scan timed out.',
      );
    }
  }
}
