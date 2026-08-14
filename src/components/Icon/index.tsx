import type {ReactNode} from 'react';
import {
  Clock,
  User,
  Pencil,
  ArrowRight,
  Rocket,
  FileText,
  FileDown,
  BookOpen,
  FlaskConical,
  Lock,
  type LucideIcon,
} from 'lucide-react';

// A single, curated registry of the icons used across the site. Everything goes
// through this map so the project uses ONE coherent icon set (Lucide) instead of
// OS-dependent emoji. Icons inherit the text color via `currentColor`, so they
// pick up the EU-blue accent / theme automatically. Add a semantic name here to
// make it available to authors (e.g. RelatedDocs front-matter `icon`).
const REGISTRY = {
  clock: Clock,
  user: User,
  edit: Pencil,
  'pen-line': Pencil,
  'arrow-right': ArrowRight,
  rocket: Rocket,
  'file-text': FileText,
  page: FileText,
  pdf: FileDown,
  book: BookOpen,
  flask: FlaskConical,
  test: FlaskConical,
  lock: Lock,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof REGISTRY;

export function isIconName(name: string): name is IconName {
  return name in REGISTRY;
}

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  /** Decorative by default (hidden from AT). Pass a label to make it meaningful. */
  label?: string;
};

export default function Icon({name, size = 16, className, label}: Props): ReactNode {
  const Cmp = REGISTRY[name];
  if (!Cmp) return null;
  return (
    <Cmp
      size={size}
      strokeWidth={2}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
