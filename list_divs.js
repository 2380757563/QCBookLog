const fs = require('fs');

const content = fs.readFileSync('D:/下载/docs-xmnote-master/QC-booklog/src/views/Reading/index.vue', 'utf-8');
const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);

if (!templateMatch) {
  console.log('No template found');
  process.exit(1);
}

const template = templateMatch[1];
const lines = template.split('\n');

const opens = [];
const closes = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;

  const lineNum = i + 1;

  const openMatches = line.match(/<div[^>]*>/g) || [];
  for (let j = 0; j < openMatches.length; j++) {
    opens.push(lineNum);
  }

  const closeMatches = line.match(/<\/div>/g) || [];
  for (let j = 0; j < closeMatches.length; j++) {
    closes.push(lineNum);
  }
}

console.log('Open divs (' + opens.length + '):');
console.log(opens.join(', '));

console.log('\nClose divs (' + closes.length + '):');
console.log(closes.join(', '));

console.log('\nDifference:', opens.length - closes.length);
