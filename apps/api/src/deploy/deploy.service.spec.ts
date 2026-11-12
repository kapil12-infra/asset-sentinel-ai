import { envUrl } from './env-url';

describe('envUrl', () => {
  it('builds stage urls', () => {
    expect(envUrl('DEV', 'shop')).toBe('https://dev.shop.in');
    expect(envUrl('PROD', 'shop')).toBe('https://shop.in');
  });
});
