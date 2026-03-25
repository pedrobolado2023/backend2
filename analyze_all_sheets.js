const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = XLSX.readFile(path.join(__dirname, '..', 'tarifario.xlsx'));
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  fs.writeFileSync(path.join(__dirname, `tarifario_${sheetName}_content.json`), JSON.stringify(data, null, 2));
  console.log(`Tarifario content for ${sheetName} saved.`);
});
