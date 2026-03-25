const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = XLSX.readFile(path.join(__dirname, '..', 'tarifario.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

fs.writeFileSync(path.join(__dirname, 'tarifario_content.json'), JSON.stringify(data, null, 2));
console.log('Tarifario content saved to tarifario_content.json');
