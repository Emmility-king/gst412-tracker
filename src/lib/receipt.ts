export function findReceiptReferences(text: string): string[] {
  const found = new Set<string>();
  const labels = /\b(?:reference|ref\.?|transaction|transfer|teller|payment|session)\s*(?:(?:id|no\.?|number|reference)\s*[:#-]?\s*|[:#]\s*)([A-Z0-9][A-Z0-9/-]{3,39})/gi;
  for (const match of text.matchAll(labels)) {
    const value = match[1].toUpperCase().replace(/[^A-Z0-9/-]/g, "");
    if (!/^(ID|NO|NUMBER|DATE|TIME|TYPE|STATUS|AMOUNT)$/.test(value)) found.add(value);
  }
  return [...found];
}
