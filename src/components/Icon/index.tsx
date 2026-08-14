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
  Compass,
  GraduationCap,
  BarChart3,
  Landmark,
  Plug,
  Library,
  SlidersHorizontal,
  ScrollText,
  Code,
  Map,
  RefreshCw,
  Wrench,
  Truck,
  Cloud,
  ShieldCheck,
  Settings,
  Ruler,
  CircleHelp,
  Database,
  Search,
  Folder,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

// A single, curated registry of the icons used across the site. Everything goes
// through this map so the project uses ONE coherent icon set (Lucide) instead of
// OS-dependent emoji. Icons inherit the text color via `currentColor`, so they
// pick up the EU-blue accent / theme automatically. Add a semantic name here to
// make it available to authors (RelatedDocs front-matter `icon`) and to the
// home-cards plugin (plugins/home-cards/index.js emits these names).
const REGISTRY = {
  // Doc chrome
  clock: Clock,
  user: User,
  edit: Pencil,
  'pen-line': Pencil,
  'arrow-right': ArrowRight,
  pdf: FileDown,
  // Shared / home-card semantic icons (keep in sync with the plugin's map)
  rocket: Rocket,
  'file-text': FileText,
  page: FileText,
  book: BookOpen,
  flask: FlaskConical,
  test: FlaskConical,
  lock: Lock,
  compass: Compass,
  'graduation-cap': GraduationCap,
  'bar-chart': BarChart3,
  landmark: Landmark,
  plug: Plug,
  library: Library,
  sliders: SlidersHorizontal,
  'scroll-text': ScrollText,
  code: Code,
  map: Map,
  refresh: RefreshCw,
  wrench: Wrench,
  truck: Truck,
  cloud: Cloud,
  shield: ShieldCheck,
  settings: Settings,
  ruler: Ruler,
  help: CircleHelp,
  database: Database,
  search: Search,
  folder: Folder,
  'external-link': ExternalLink,
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
