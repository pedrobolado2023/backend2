const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'tarifario.xlsx');
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('Finding Luxo Casal...');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(c => c && c.toString().includes('Luxo Casal'))) {
      console.log(`Found at row ${i}:`, JSON.stringify(row, null, 2));
    }
  }
} catch (e) {
  console.error('Error:', e.message);
}
