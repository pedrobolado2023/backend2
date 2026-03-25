const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'tarifario.xlsx');
  const workbook = XLSX.readFile(filePath);
  console.log('SheetNames:', workbook.SheetNames);
  workbook.SheetNames.forEach(name => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
    console.log(`--- SHEET: ${name} (First 10 rows) ---`);
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
  });
} catch (e) {
  console.error('Error:', e.message);
}
