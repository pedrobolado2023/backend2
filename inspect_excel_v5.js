const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'tarifario.xlsx');
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('--- Rows 10 to 20 ---');
  console.log(JSON.stringify(rows.slice(10, 21), null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
