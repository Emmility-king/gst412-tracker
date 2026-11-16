import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const sourcePath = new URL('../manual/GST412-manual-source.txt', import.meta.url);
const outputPath = new URL('../manual/GST412-manual.pdf', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const pageSize = [595.28, 841.89];
const marginX = 52;
const top = 790;
const bottom = 48;
let page;
let y;

function ascii(text) {
  return text
    .replace(/â‚¦/g, 'NGN ')
    .replace(/₦/g, 'NGN ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/â€¢/g, '*')
    .replace(/Ã—/g, 'x')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function newPage() {
  page = pdf.addPage(pageSize);
  y = top;
}

function isHeading(text, index) {
  return index < 4 || /^(Welcome & Manual Guidelines|Week [1-8]:|\d+\. (Practical|Student|Weekly)|CUMULATIVE ASSESSMENT RECORD|Weekly Performance Summary Table|Final Grade Computation & Sign-Off|CERTIFICATE OF COMPLETION|WELLSPRING UNIVERSITY|ICT DIRECTORATE)/i.test(text);
}

function drawLine(text, { size = 9, font = regular, indent = 0, color = rgb(0.16, 0.2, 0.25) } = {}) {
  if (y < bottom + size * 1.5) newPage();
  page.drawText(text, { x: marginX + indent, y, size, font, color, maxWidth: pageSize[0] - marginX * 2 - indent });
  y -= size * 1.45;
}

newPage();
const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const raw = lines[i].replace(/\t/g, '   |   ');
  const text = ascii(raw);
  if (!text) {
    y -= 4;
    continue;
  }

  const heading = isHeading(text, i);
  const title = i < 3;
  const size = title ? (i === 0 ? 19 : i === 1 ? 13 : 10) : heading ? 11 : 9;
  const font = heading || title ? bold : regular;
  const maxWidth = pageSize[0] - marginX * 2 - (heading ? 0 : 10);
  const words = text.split(/\s+/);
  let current = '';
  const wrapped = [];

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) wrapped.push(current);

  if (heading && y < bottom + 55) newPage();
  if (heading && !title) y -= 5;
  for (const row of wrapped) {
    drawLine(row, { size, font, indent: heading ? 0 : 8, color: heading ? rgb(0.02, 0.2, 0.36) : undefined });
  }
}

await writeFile(outputPath, await pdf.save());
console.log(`Created ${outputPath.pathname}`);
