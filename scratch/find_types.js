const fs = require('fs');

function searchFile(path, term) {
  if (fs.existsSync(path)) {
    const c = fs.readFileSync(path, 'utf8');
    if (c.includes(term)) console.log(`Found "${term}" in ${path}`);
  }
}

searchFile('frontend/src/types/semanticGraph.ts', 'LayoutDirection');
searchFile('frontend/src/types/semanticGraph.ts', 'ThemeMode');
searchFile('frontend/src/lib/graphColoring.ts', 'ThemeMode');
searchFile('frontend/src/lib/layoutAlgorithms.ts', 'LayoutDirection');
