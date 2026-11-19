import { ICONS } from './iconData';

export type IconName = keyof typeof ICONS | string;

/** Inline SVG icon. Styling (size, stroke) comes from the global `svg` rule. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const def = ICONS[name] ?? ICONS.file;
  return (
    <svg
      viewBox={def.viewBox}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: def.svg }}
    />
  );
}
