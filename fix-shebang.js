const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'build', 'index.js');
const content = fs.readFileSync(filePath, 'utf8');

if (!content.startsWith('#!/usr/bin/env node')) {
    const newContent = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(filePath, newContent);
    fs.chmodSync(filePath, 0o755);
    console.log('Shebang adicionado e arquivo tornado executável');
}