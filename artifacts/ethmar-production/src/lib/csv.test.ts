import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from './csv.ts';

test('ignores final blank lines and preserves incomplete records', () => {
  const result = parseCsv('run_id,event_id,record_type,input_kg\nE-01,DEMO-1,production,1000\nE-02,,production,\n\n');
  assert.equal(result.error, null);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows[2].cells, ['E-02', '', 'production', '']);
  assert.equal(result.rows[2].startLine, 3);
});

test('keeps physical source spans across blank lines and quoted newlines', () => {
  const result = parseCsv('\uFEFFrun_id,event_id,record_type,shift\r\n\r\nE-01,DEMO-1,production,"line1\r\nline2"\r\nE-02,DEMO-2,production,day\r\n');
  assert.equal(result.error, null);
  assert.equal(result.hadBom, true);
  assert.equal(result.rows[1].startLine, 3);
  assert.equal(result.rows[1].endLine, 4);
  assert.equal(result.rows[2].startLine, 5);
  assert.equal(result.rows[1].cells[3], 'line1\r\nline2');
  assert.equal(result.rows[1].raw, 'E-01,DEMO-1,production,"line1\r\nline2"');
});

test('retains duplicate records, short rows and extra raw cells with parse errors', () => {
  const result = parseCsv('run_id,event_id,record_type\nE-01,DEMO-1,production\nE-01,DEMO-1,production\nE-02\nE-02,DEMO-2,production,extra\n');
  assert.ok(result.error);
  assert.equal(result.rows.length, 5);
  assert.deepEqual(result.rows[1].cells, result.rows[2].cells);
  assert.deepEqual(result.rows[3].cells, ['E-02']);
  assert.equal(result.rows[4].cells[3], 'extra');
});

test('detects semicolon delimiter and reports duplicate column titles', () => {
  assert.equal(parseCsv('run_id;event_id;record_type\nE-01;DEMO-1;production').delimiter, ';');
  assert.match(parseCsv('run_id,event_id,record_type,event_id\nE-01,DEMO-1,production,DEMO-2').error ?? '', /مكررة/);
});
