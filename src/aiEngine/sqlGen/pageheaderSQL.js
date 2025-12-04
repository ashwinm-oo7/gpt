export function generatePageheaderSQL(repcode, table) {
  return `
CREATE VIEW sabrep_pageheader_${repcode} AS
SELECT 'Entno' AS colname, a.sabid, a.entno AS bname
FROM ${table} a
UNION ALL
SELECT 'Entdt', a.sabid, CONVERT(nvarchar, a.entdt, 110)
FROM ${table} a
UNION ALL
SELECT 'line1', a.sabid, 'line'
FROM ${table} a;
  `;
}
