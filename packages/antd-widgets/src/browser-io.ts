/**
 * The two things the cell menu does to the BROWSER, never to the store:
 * text onto the clipboard, a file into the downloads. One place, so the
 * hooks that call them stay free of the DOM's own APIs.
 */

/** The old way, for a page not served over https (the async clipboard is absent there): a field selected and copied. */
function copyThroughField(text: string): void {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

/** The text onto the clipboard — called from a click or a key press, which is what lets a page write there. */
export function writeClipboard(text: string): void {
  if (typeof navigator.clipboard?.writeText !== "function") {
    copyThroughField(text);
    return;
  }
  navigator.clipboard.writeText(text).catch(() => copyThroughField(text));
}

/** The text as a file the browser saves under `name`. */
export function saveFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A link cell's address as a whole one: an application path gets the page's origin before it. */
export function wholeAddress(href: string): string {
  try {
    return new URL(href, document.baseURI).href;
  } catch {
    return href;
  }
}
