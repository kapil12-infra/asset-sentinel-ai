/** Monthly AI token allowance shown in the sidebar and billing page. */
export const AI_TOKEN_CAP = 5_000_000;

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const rand = (min: number, max: number, rng: () => number = Math.random) =>
  min + Math.floor(rng() * (max - min + 1));
