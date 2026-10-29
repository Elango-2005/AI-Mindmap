/**
 * Stress and Performance Test for MindVault Production Layout Engine
 * Scales: 20, 50, 100, 250 nodes
 */

const { performance } = require('perf_hooks');

// Import layout logic from scratch/test_mathematical_layout.js
const fs = require('fs');

function generateStressTree(numNodes) {
  const nodes = [
    { id: 'root', data: { label: 'Enterprise Platform Architecture', semanticType: 'root' } }
  ];
  const edges = [];

  // 4 to 8 main topic branches
  const numTopics = Math.min(8, Math.max(3, Math.floor(numNodes / 10)));
  for (let i = 1; i <= numTopics; i++) {
    const tid = `topic_${i}`;
    nodes.push({ id: tid, data: { label: `Domain Service Subsystem ${i}`, semanticType: 'topic' } });
    edges.push({ source: 'root', target: tid });
  }

  let currIdx = numTopics + 1;
  let parentIdx = 1;
  while (nodes.length < numNodes) {
    const parentId = nodes[parentIdx].id;
    const cid = `node_${currIdx}`;
    const isLeaf = currIdx % 3 === 0;
    nodes.push({
      id: cid,
      data: {
        label: `Component Spec ${currIdx} (${isLeaf ? 'Detail' : 'Concept'})`,
        semanticType: isLeaf ? 'concept' : 'task'
      }
    });
    edges.push({ source: parentId, target: cid });

    currIdx++;
    if (currIdx % 4 === 0) {
      parentIdx = (parentIdx % (nodes.length - 1)) + 1;
    }
  }

  // Add 10% secondary cross-branch relationships
  const numRelationships = Math.floor(numNodes * 0.1);
  for (let r = 0; r < numRelationships; r++) {
    const s = nodes[1 + (r * 3) % (nodes.length - 1)].id;
    const t = nodes[1 + (r * 7 + 2) % (nodes.length - 1)].id;
    if (s !== t) {
      edges.push({ source: s, target: t, data: { edgeType: 'relationship', label: `Sync Protocol ${r}` } });
    }
  }

  return { nodes, edges };
}

// Load test function
const code = fs.readFileSync('scratch/test_mathematical_layout.js', 'utf8');
eval(code.substring(0, code.indexOf('// ----------------------------------------------------')));

console.log('====================================================');
console.log('MINDVAULT LAYOUT ENGINE SCALE & PERFORMANCE BENCHMARK');
console.log('====================================================');

[20, 50, 100, 250].forEach(size => {
  const { nodes, edges } = generateStressTree(size);
  console.log(`\n--- Test Scale: ${size} Nodes (${edges.length} Edges) ---`);

  ['radial', 'horizontal', 'vertical'].forEach(mode => {
    const t0 = performance.now();
    const res = runTidyMindMapLayout(nodes, edges, mode);
    const duration = performance.now() - t0;

    // Verify collisions
    const list = Array.from(res.positions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y,
      dims: measureNode(nodes.find(n => n.id === id))
    }));

    let collisions = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const buffer = 2;
        const aLeft = a.x - a.dims.width / 2;
        const aRight = a.x + a.dims.width / 2;
        const aTop = a.y - a.dims.height / 2;
        const aBottom = a.y + a.dims.height / 2;

        const bLeft = b.x - b.dims.width / 2;
        const bRight = b.x + b.dims.width / 2;
        const bTop = b.y - b.dims.height / 2;
        const bBottom = b.y + b.dims.height / 2;

        const overlapX = (aLeft < bRight - buffer) && (aRight > bLeft + buffer);
        const overlapY = (aTop < bBottom - buffer) && (aBottom > bTop + buffer);

        if (overlapX && overlapY) {
          collisions++;
        }
      }
    }

    console.log(`  [${mode.toUpperCase().padEnd(10)}] Layout time: ${duration.toFixed(2)}ms | Nodes: ${list.length} | Collisions: ${collisions}`);
  });
});
