/**
 * Puts `text` on the clipboard, falling back when the API is unavailable.
 *
 * `navigator.clipboard` is denied outside a secure context — plain http, which
 * is how the site is served in the dev container — so a copy button that only
 * used it would do nothing there. The textarea-and-`execCommand` route is
 * deprecated but still works in every browser, and works on http.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
