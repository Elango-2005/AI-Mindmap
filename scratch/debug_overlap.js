const fs = require('fs');

// Debug overlap check
const a = { id: 'c3_1', x: 600, y: 100, dims: { width: 200, height: 42 } };
const b = { id: 'c3_2', x: 600, y: 166, dims: { width: 200, height: 42 } };
const pad = 4;
const xOverlap = Math.abs(a.x - b.x) < (a.dims.width + b.dims.width) / 2 + pad;
const yOverlap = Math.abs(a.y - b.y) < (a.dims.height + b.dims.height) / 2 + pad;
console.log('xOverlap:', xOverlap);
console.log('Math.abs(a.y - b.y):', Math.abs(a.y - b.y));
console.log('(a.dims.height + b.dims.height) / 2 + pad:', (a.dims.height + b.dims.height) / 2 + pad);
console.log('yOverlap:', yOverlap);
