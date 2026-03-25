const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'tarifario.xlsx');
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('--- FIRST DATA OBJECT ---');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('--- OBJECT KEYS ---');
  console.log(JSON.stringify(Object.keys(data[0]), null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
