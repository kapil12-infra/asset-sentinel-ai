export const envUrl = (stage: string, slug: string) => {
  const s = stage.toLowerCase();
  return s === 'prod' ? `https://${slug}.in` : `https://${s}.${slug}.in`;
};
