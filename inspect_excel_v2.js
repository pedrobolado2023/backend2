const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'tarifario.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('--- HEADERS (First 5 rows) ---');
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
