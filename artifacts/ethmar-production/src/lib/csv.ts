import Papa from 'papaparse';

export type CsvRow = { cells: string[]; startLine: number; endLine: number; raw: string };
export type CsvParseResult = {
  delimiter: string;
  rows: CsvRow[];
  error: string | null;
  hadBom: boolean;
  blankLines: number;
};

/** Papa handles CSV syntax; a second Papa pass preserves physical source spans. */
export function parseCsv(input: string): CsvParseResult {
  const hadBom = input.charCodeAt(0) === 0xfeff;
  const text = hadBom ? input.slice(1) : input;
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });
  const rows: CsvRow[] = [];
  let cursor = 0;
  let line = 1;
  let blankLines = 0;
  Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    delimiter: result.meta.delimiter,
    newline: result.meta.linebreak as '\r' | '\n' | '\r\n',
    step: (step) => {
      const end = step.meta.cursor;
      const segment = text.slice(cursor, end);
      const raw = segment.replace(/(?:\r\n|\r|\n)$/, '');
      const breaks = (segment.match(/\r\n|\r|\n/g) ?? []).length;
      const rawBreaks = (raw.match(/\r\n|\r|\n/g) ?? []).length;
      if (step.data.join('').trim() === '') blankLines++;
      else rows.push({ cells: step.data, startLine: line, endLine: line + rawBreaks, raw });
      cursor = end;
      line += breaks;
    },
  });
  // Keep every non-empty data row, including rows with missing fields.
  const errors = result.errors.map((e) => {
    const row = e.row === undefined ? undefined : rows[e.row + 1];
    return `${row ? `الصف ${row.startLine}: ` : ''}${e.message}`;
  });
  if (result.meta.renamedHeaders && Object.keys(result.meta.renamedHeaders).length) {
    errors.push('توجد عناوين أعمدة مكررة؛ راجع ربط الأعمدة قبل الاستيراد.');
  }
  return { delimiter: result.meta.delimiter, rows, error: errors.length ? errors.join(' • ') : null, hadBom, blankLines };
}
