import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import * as React from 'react';

type IconProps = LucideProps & {
  as: LucideIcon;
};

/**
 * NativeWind v5's polyfill wraps React Native core components only — it does
 * NOT cover react-native-svg (which lucide icons render into), so `text-*`
 * className colours are silently dropped on native while working on web.
 * Resolve the effective text class to a hex fallback so icons keep their
 * colour on device. An explicit `color` prop always wins.
 *
 * The app runs dark (see Appearance in app/_layout.tsx), so a `dark:text-*`
 * class takes priority over its light counterpart.
 */
const TOKENS: Record<string, string> = {
  'text-background': '#070B14',
  'text-foreground': '#ECF4EF',
  'text-card-foreground': '#ECF4EF',
  'text-muted-foreground': '#94A3B8',
  'text-primary': '#3ADD6C',
  'text-primary-foreground': '#04110A',
  'text-secondary-foreground': '#ECF4EF',
  'text-accent': '#A3E635',
  'text-accent-foreground': '#0B1503',
  'text-destructive': '#F87171',
  'text-success': '#34D399',
  'text-warning': '#FBBF24',
  'text-info': '#38BDF8',
  'text-white': '#FFFFFF',
  'text-black': '#000000',
  'text-popover-foreground': '#ECF4EF',
};

const PALETTE: Record<string, Record<string, string>> = {
  cyan: { '300': '#67E8F9', '400': '#22D3EE', '500': '#06B6D4', '600': '#0891B2' },
  sky: { '300': '#7DD3FC', '400': '#38BDF8', '500': '#0EA5E9', '600': '#0284C7' },
  blue: { '400': '#60A5FA', '500': '#3B82F6', '600': '#2563EB' },
  indigo: { '400': '#818CF8', '500': '#6366F1' },
  violet: { '300': '#C4B5FD', '400': '#A78BFA', '500': '#8B5CF6' },
  purple: { '400': '#C084FC', '500': '#A855F7' },
  pink: { '400': '#F472B6', '500': '#EC4899' },
  lime: { '300': '#BEF264', '400': '#A3E635', '500': '#84CC16', '600': '#65A30D' },
  green: { '400': '#4ADE80', '500': '#22C55E', '600': '#16A34A' },
  emerald: { '300': '#6EE7B7', '400': '#34D399', '500': '#10B981', '600': '#059669' },
  teal: { '400': '#2DD4BF', '500': '#14B8A6' },
  amber: { '300': '#FCD34D', '400': '#FBBF24', '500': '#F59E0B', '600': '#D97706' },
  yellow: { '400': '#FACC15', '500': '#EAB308' },
  orange: { '400': '#FB923C', '500': '#F97316' },
  rose: { '300': '#FDA4AF', '400': '#FB7185', '500': '#F43F5E', '600': '#E11D48' },
  red: { '400': '#F87171', '500': '#EF4444', '600': '#DC2626' },
  slate: { '400': '#94A3B8', '500': '#64748B' },
};

function resolve(token: string): string | undefined {
  const direct = TOKENS[token];
  if (direct) return direct;
  const m = token.match(/^text-([a-z]+)-(\d{3})(?:\/\d+)?$/);
  return m ? PALETTE[m[1]]?.[m[2]] : undefined;
}

function colorFromClasses(classes: string): string | undefined {
  let base: string | undefined;
  let dark: string | undefined;
  for (const token of classes.split(/\s+/)) {
    if (token.startsWith('dark:')) {
      dark = resolve(token.slice(5)) ?? dark;
    } else if (!token.includes(':')) {
      base = resolve(token) ?? base;
    }
  }
  return dark ?? base;
}

function Icon({ as: IconComponent, className, size = 14, color, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  const classes = cn('text-foreground', textClass, className);
  return (
    <IconComponent
      className={classes}
      size={size}
      color={color ?? colorFromClasses(classes)}
      {...props}
    />
  );
}

export { Icon };
