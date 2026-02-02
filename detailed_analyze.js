const fs = require('fs');

const content = fs.readFileSync('D:/下载/docs-xmnote-master/QC-booklog/src/views/Reading/index.vue', 'utf-8');
const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);

if (!templateMatch) {
  console.log('No template found');
  process.exit(1);
}

const template = templateMatch[1];
const lines = template.split('\n');

let totalOpen = 0;
let totalClose = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;

  const openMatches = line.match(/<div[^>]*>/g) || [];
  const closeMatches = line.match(/<\/div>/g) || [];

  totalOpen += openMatches.length;
  totalClose += closeMatches.length;

  if (openMatches.length > 0 || closeMatches.length > 0) {
    console.log(`Line ${i + 1}: opens=${openMatches.length} closes=${closeMatches.length} | line="${line.trim().substring(0, 60)}"`);
  }
}

console.log('\nTotal opens:', totalOpen);
console.log('Total closes:', totalClose);
console.log('Difference:', totalOpen - totalClose);
