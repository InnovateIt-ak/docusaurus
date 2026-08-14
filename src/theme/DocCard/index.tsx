import type {ReactNode} from 'react';
import {
  useDocById,
  findFirstSidebarItemLink,
} from '@docusaurus/plugin-content-docs/client';
import {
  extractLeadingEmoji,
  useDocCardDescriptionCategoryItemsPlural,
} from '@docusaurus/theme-common/internal';
import isInternalUrl from '@docusaurus/isInternalUrl';
import Layout from '@theme/DocCard/Layout';
import type {Props} from '@theme/DocCard';
import type {
  PropSidebarItemCategory,
  PropSidebarItemLink,
} from '@docusaurus/plugin-content-docs';
import Icon from '@site/src/components/Icon';

// Swizzled DocCard. The stock theme falls back to emoji on category-index cards
// (🗃 for a category, 📄 for an internal doc, 🔗 for an external link). This
// renders coherent Lucide icons instead. An author-provided *leading emoji* in
// the label is still respected — only the generic fallback changes.
function fallbackIcon(
  item: PropSidebarItemCategory | PropSidebarItemLink,
): ReactNode {
  if (item.type === 'category') {
    return <Icon name="folder" size={20} />;
  }
  return isInternalUrl(item.href) ? (
    <Icon name="file-text" size={20} />
  ) : (
    <Icon name="external-link" size={20} />
  );
}

function getIconTitleProps(item: PropSidebarItemCategory | PropSidebarItemLink) {
  const extracted = extractLeadingEmoji(item.label);
  const icon: ReactNode = extracted.emoji ?? fallbackIcon(item);
  return {icon, title: extracted.rest.trim() || item.label};
}

function CardCategory({item}: {item: PropSidebarItemCategory}): ReactNode {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useDocCardDescriptionCategoryItemsPlural();
  // Categories that don't have a link are filtered upstream.
  if (!href) {
    return null;
  }
  return (
    <Layout
      item={item}
      className={item.className}
      href={href}
      description={item.description ?? categoryItemsPlural(item.items.length)}
      {...getIconTitleProps(item)}
    />
  );
}

function CardLink({item}: {item: PropSidebarItemLink}): ReactNode {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <Layout
      item={item}
      className={item.className}
      href={item.href}
      description={item.description ?? doc?.description}
      {...getIconTitleProps(item)}
    />
  );
}

export default function DocCard({item}: Props): ReactNode {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
