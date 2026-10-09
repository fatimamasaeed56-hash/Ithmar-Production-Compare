export type CsvRow = { cells: string[]; startLine: number; endLine: number; raw: string };
export type CsvParseResult = {
  delimiter: ',' | ';';
  rows: CsvRow[];
  error: string | null;
  hadBom: boolean;
  blankLines: number;
};

function detectDelimiter(text: string): ',' | ';' {
  let inQ = false;
  let commas = 0;
  let semis = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && (c === '\n' || c === '\r')) break;
    else if (!inQ && c === ',') commas++;
    else if (!inQ && c === ';') semis++;
  }
  return semis > commas ? ';' : ',';
}

/** RFC4180-style parser that keeps physical line numbers and raw row text. */
export function parseCsv(input: string): CsvParseResult {
  const hadBom = input.charCodeAt(0) === 0xfeff;
  const text = hadBom ? input.slice(1) : input;
  const d = detectDelimiter(text);
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQ = false;
  let cellQuoted = false;
  let line = 1;
  let start = 1;
  let startIdx = 0;
  let i = 0;
  let blankLines = 0;

  const pushRow = (endIdx: number) => {
    cells.push(cell);
    const raw = text.slice(startIdx, endIdx);
    if (cells.length === 1 && cells[0].trim() === '' && !cellQuoted) blankLines++;
    rows.push({ cells, startLine: start, endLine: line, raw });
    cells = [];
    cell = '';
    cellQuoted = false;
  };

  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) line++;
      cell += c;
      i++;
      continue;
    }
    if (c === '"' && cell.trim() === '' && !cellQuoted) {
      inQ = true;
      cellQuoted = true;
      cell = '';
      i++;
      continue;
    }
    if (c === d) {
      cells.push(cell);
      cell = '';
      cellQuoted = false;
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      pushRow(i);
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
      line++;
      start = line;
      startIdx = i;
      continue;
    }
    cell += c;
    i++;
  }
  if (inQ) {
    return { delimiter: d, rows, error: `علامة اقتباس غير مغلقة تبدأ في السطر ${start}`, hadBom, blankLines };
  }
  if (cell !== '' || cells.length > 0 || cellQuoted) pushRow(text.length);
  return { delimiter: d, rows, error: null, hadBom, blankLines };
}
