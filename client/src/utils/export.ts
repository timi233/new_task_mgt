export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

const escapeCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '""';
  }
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  if (!columns.length) return;

  const header = columns.map(col => escapeCell(col.label)).join(',');
  const data = rows.map(row =>
    columns.map(col => escapeCell(col.value(row))).join(','),
  );
  const csvContent = [header, ...data].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
