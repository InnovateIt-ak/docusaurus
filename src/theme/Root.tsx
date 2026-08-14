import type {ReactNode} from 'react';
import CommandPalette from '@site/src/components/CommandPalette';

// The theme's Root wraps the whole app (persists across navigation). The default
// Root just renders its children; we additionally mount the ⌘K command palette
// once for the entire site.
export default function Root({children}: {children: ReactNode}): ReactNode {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
