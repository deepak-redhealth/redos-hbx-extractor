// lib/exportEngine.ts
// Export data to CSV and Excel with business-friendly column headers

import { ColumnDef } from './columnSchema';

type ExportFormat = 'csv' | 'xlsx';

export async function exportData(
  rows: Record<string, any>[],
  columnDefs: ColumnDef[],
  format: ExportFormat,
  filename?: string
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = filename || `red-health-export-${ts}`;

  // Build header map: raw column alias → business label
  const headerMap: Record<string, string> = {};
  for (const col of columnDefs) {
    // Extract alias from expression (last word after AS, or use id)
    const expr = col.redosExpr || col.hbxExpr || '';
    const aliasMatch = expr.match(/AS\s+(\w+)\s*$/i);
    const alias = aliasMatch ? aliasMatch[1] : col.id;
    headerMap[alias] = col.label;
    // Also map by col.id as fallback
    headerMap[col.id] = col.label;
  }

  // Rename columns in rows
  const renamedRows = rows.map(row => {
    const newRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      // Try alias match, then col.id match, then keep original
      const label = headerMap[key] || headerMap[key.toLowerCase()] || key;
      newRow[label] = val === null || val === undefined ? '' : val;
    }
    return newRow;
  });

  if (format === 'csv') {
    // Build CSV manually to avoid type issues with json2csv version
    const headers = Object.keys(renamedRows[0] || {});
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const csvRows = [
      headers.map(escape).join(','),
      ...renamedRows.map(row => headers.map(h => escape(row[h])).join(',')),
    ];
    const csv = csvRows.join('\n');
    return {
      buffer: Buffer.from(csv, 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseFilename}.csv`,
    };
  }

  // Excel export
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(renamedRows);

  // Style header row (bold)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddr]) {
      ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E8F0FE' } } };
    }
  }

  // Auto-fit column widths
  const colWidths = Object.keys(renamedRows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...renamedRows.slice(0, 50).map(r => String(r[key] || '').length), 10),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Red Health Data');

  // Metadata sheet
  const metaData = [
    { Field: 'Export Date', Value: new Date().toISOString() },
    { Field: 'Total Rows', Value: rows.length },
    { Field: 'Columns', Value: columnDefs.map(c => c.label).join(', ') },
  ];
  const metaWs = XLSX.utils.json_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${baseFilename}.xlsx`,
  };
}
