import {useEffect, useRef, useState, type ComponentProps, type ReactNode} from 'react';
import clsx from 'clsx';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import {translate} from '@docusaurus/Translate';
import NavbarItem, {type LinkLikeNavbarItemProps} from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import styles from './styles.module.css';

// Swizzled copy of the theme's Navbar/Content. The only functional change vs.
// upstream is that the LEFT items no longer overflow the bar: whatever does not
// fit on one line is folded into a trailing "More" dropdown (see
// NavbarLeftItems below). Upstream renders every item unconditionally, which on
// a site with a long project title and a dozen sections gives the two-line,
// mid-label-wrapping navbar this component exists to avoid.
//
// Right-hand items (search, theme toggle, the "PDF" menu…) are left alone:
// they are few, fixed, and are the ones a reader expects to find in place.
// The no-wrap rules that keep a label from breaking across two lines live in
// src/css/custom.css, next to the rest of the navbar styling.

type NavbarItemConfig = ComponentProps<typeof NavbarItem>;

function useNavbarItems(): NavbarItemConfig[] {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

function NavbarItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              {cause: error},
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

const overflowLabel = (): string =>
  translate({
    id: 'theme.navbar.overflowMenu',
    message: 'More',
    description:
      'The label of the navbar dropdown holding the items that did not fit',
  });

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Adapt the items that did not fit to life inside the "More" dropdown. A
// dropdown cannot nest inside a dropdown (the theme would render a second
// hoverable menu inside the open one), so a folded dropdown is flattened: its
// label becomes a non-clickable heading, its children plain entries under it.
function asDropdownItems(
  items: NavbarItemConfig[],
): LinkLikeNavbarItemProps[] {
  return items.flatMap((item): LinkLikeNavbarItemProps[] => {
    const {items: children, label} = item as {
      items?: LinkLikeNavbarItemProps[];
      label?: string;
    };
    if (!Array.isArray(children)) {
      // Anything left in the bar is link-like by construction: the dropdowns
      // are the only navbar items that are not, and they are handled below.
      return [item as LinkLikeNavbarItemProps];
    }
    return [
      {
        type: 'html',
        className: styles.overflowHeading,
        value: escapeHtml(label ?? ''),
      },
      ...children,
    ];
  });
}

// Render the left items on a single line, folding the tail that does not fit
// into a "More" dropdown.
//
// The widths are read from a hidden mirror of the full list rather than from
// the rendered row: the mirror always holds every item at its natural width, so
// one measurement answers both "what still fits" and "what fits again once the
// window grows", with no render-measure-render cycle. The visible row takes the
// space the brand and the right-hand items leave and asks for none of its own
// (`flex-basis: 0`), so its width does not depend on how many items we chose to
// show — folding items cannot feed back into the measurement.
//
// First render (and any render without JS) shows every item, which is what the
// server emits; the fold happens on mount, once widths are known.
function NavbarLeftItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  const rowRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  // Until the first measurement lands, the row clips whatever sticks out (see
  // .clipped): that is the state the server renders, and the one a reader
  // without JavaScript keeps — better a cut item than items running under the
  // search field. Once JS is in charge the clipping goes, because it would
  // otherwise cut the open "More" menu, which hangs below the bar.
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    const mirror = mirrorRef.current;
    if (!row || !mirror || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const measure = () => {
      const probes = Array.from(mirror.children) as HTMLElement[];
      // The mirror ends with a probe of the "More" toggle itself, so the space
      // it needs is known before deciding to show it.
      const moreWidth =
        probes.pop()?.getBoundingClientRect().width ?? 0;
      const widths = probes.map((el) => el.getBoundingClientRect().width);
      const available = row.clientWidth;

      // Below 996px Infima hides navbar items outright (they live in the
      // sidebar drawer instead): nothing measurable, nothing to fold.
      if (available === 0 || widths.every((width) => width === 0)) {
        setVisibleCount(items.length);
        setMeasured(true);
        return;
      }

      // How many leading items fit in `budget`; 0.5px of slack absorbs the
      // sub-pixel rounding of fractional label widths.
      const fits = (budget: number) => {
        let used = 0;
        let count = 0;
        for (const width of widths) {
          if (used + width > budget + 0.5) {
            break;
          }
          used += width;
          count += 1;
        }
        return count;
      };

      const withoutToggle = fits(available);
      setVisibleCount(
        withoutToggle === widths.length
          ? widths.length
          : fits(available - moreWidth),
      );
      setMeasured(true);
    };

    measure();
    // The row resizes with the window; the mirror resizes when a webfont
    // finally swaps in and every label changes width under us.
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(mirror);
    return () => observer.disconnect();
    // Keyed on the number of items rather than the (freshly built on every
    // render) array: a label that changes without changing the count resizes
    // the mirror, and the observer picks that up on its own.
  }, [items.length]);

  const overflowItems = items.slice(visibleCount);

  return (
    <div
      ref={rowRef}
      className={clsx(styles.leftItems, !measured && styles.clipped)}>
      <NavbarItems items={items.slice(0, visibleCount)} />
      {overflowItems.length > 0 && (
        <NavbarItem
          type="dropdown"
          position="left"
          label={overflowLabel()}
          items={asDropdownItems(overflowItems)}
        />
      )}
      {/* Measurement mirror: every item at its natural width. `visibility:
          hidden` keeps it out of the layout, the accessibility tree and the
          tab order, so it is a ruler and nothing else. */}
      <div ref={mirrorRef} className={styles.mirror} aria-hidden="true">
        <NavbarItems items={items} />
        <NavbarItem type="dropdown" label={overflowLabel()} items={[]} />
      </div>
    </div>
  );
}

function NavbarContentLayout({left, right}: {left: ReactNode; right: ReactNode}) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items',
        )}>
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right',
        )}>
        {right}
      </div>
    </div>
  );
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const searchBarItem = items.find((item) => item.type === 'search');
  return (
    <NavbarContentLayout
      left={
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <NavbarLeftItems items={leftItems} />
        </>
      }
      right={
        <>
          <NavbarItems items={rightItems} />
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
        </>
      }
    />
  );
}
