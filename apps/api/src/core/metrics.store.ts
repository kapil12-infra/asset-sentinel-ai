import { Injectable } from '@nestjs/common';

export interface Sample {
  t: number;
  ms: number;
  ok: boolean;
}

/** In-memory ring of request samples. Resets when the process restarts. */
@Injectable()
export class MetricsStore {
  private samples: Sample[] = [];
  private readonly max = 20000;

  record(ms: number, ok: boolean): void {
    this.samples.push({ t: Date.now(), ms, ok });
    if (this.samples.length > this.max) this.samples.splice(0, this.max / 4);
  }

  between(from: number, to: number): Sample[] {
    return this.samples.filter((s) => s.t >= from && s.t < to);
  }

  recent(n: number): Sample[] {
    return this.samples.slice(-n);
  }
}
