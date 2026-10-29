const fs = require('fs');
// Let's print out the positions from the prototype test
const content = fs.readFileSync('scratch/test_layout_engine_prototype.js', 'utf8');
const modContent = content.replace(
  `  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {`,
  `  list.forEach(item => console.log('    ' + item.id + ': x=' + item.x + ', y=' + item.y + ', w=' + item.dims.width + ', h=' + item.dims.height));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {`
);
fs.writeFileSync('scratch/debug_prototype_print.js', modContent, 'utf8');
