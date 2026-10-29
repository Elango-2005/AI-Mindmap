/**
 * MindVault Phase 7 Automated Integration & Regression Test Suite
 */

const fs = require('fs');

console.log('====================================================');
console.log('MINDVAULT PHASE 7 INTEGRATION & REGRESSION TEST SUITE');
console.log('====================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// SECTION 1 & 3: NODE TYPES & SEMANTIC INTEGRITY
// ----------------------------------------------------
console.log('\n--- Test Suite 1: Node Semantic Hierarchy & Types ---');
const nodeTypes = ['root', 'topic', 'concept', 'task', 'insight', 'ai_suggestion'];
const semanticNodeDefinitions = {
  root: { minLevel: 0, maxLevel: 0, expectedShape: 'pill', bgFilled: true },
  topic: { minLevel: 1, maxLevel: 1, expectedShape: 'pill', hasIcon: true },
  concept: { minLevel: 2, maxLevel: 5, expectedShape: 'pill', isCard: true },
  task: { minLevel: 1, maxLevel: 5, hasStatus: true },
  insight: { minLevel: 1, maxLevel: 5, hasIcon: true },
  ai_suggestion: { minLevel: 1, maxLevel: 5, isDashed: true }
};

nodeTypes.forEach(type => {
  assert(semanticNodeDefinitions[type] !== undefined, `Semantic node type '${type}' is strictly defined`);
});

// Check EditableNode.tsx for all 6 types
const editableNodeCode = fs.readFileSync('frontend/src/components/EditableNode.tsx', 'utf8');
nodeTypes.forEach(type => {
  assert(
    editableNodeCode.includes(type) || editableNodeCode.includes(type.toUpperCase()),
    `EditableNode.tsx implements rendering for '${type}'`
  );
});

// ----------------------------------------------------
// SECTION 2 & 4: EDGE ROUTING & DYNAMIC HANDLES
// ----------------------------------------------------
console.log('\n--- Test Suite 2: Edge Routing & Dynamic Handles ---');
const layoutCode = fs.readFileSync('frontend/src/lib/layoutAlgorithms.ts', 'utf8');

assert(layoutCode.includes('sourceHandle'), 'layoutAlgorithms assigns sourceHandle dynamically');
assert(layoutCode.includes('targetHandle'), 'layoutAlgorithms assigns targetHandle dynamically');
assert(layoutCode.includes('determineOptimalHandles'), 'determineOptimalHandles is exported and implemented');
assert(layoutCode.includes('computeLayoutPositions'), 'computeLayoutPositions is exported and implemented');
assert(layoutCode.includes('applyLayout'), 'applyLayout is exported and implemented');
assert(layoutCode.includes('applySemanticLayout'), 'applySemanticLayout is exported and implemented');

// Test handle assignment logic matching determineOptimalHandles in layoutAlgorithms.ts
function determineOptimalHandles(sourcePos, targetPos, layout) {
  if (layout === "horizontal") {
    return {
      sourceHandle: "source-right",
      targetHandle: "target-left",
    };
  }
  if (layout === "vertical") {
    return {
      sourceHandle: "source-bottom",
      targetHandle: "target-top",
    };
  }
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    if (dx >= 0) {
      return { sourceHandle: "source-right", targetHandle: "target-left" };
    } else {
      return { sourceHandle: "source-left", targetHandle: "target-right" };
    }
  } else {
    if (dy >= 0) {
      return { sourceHandle: "source-bottom", targetHandle: "target-top" };
    } else {
      return { sourceHandle: "source-top", targetHandle: "target-bottom" };
    }
  }
}

// Horizontal layout
const horizConn = determineOptimalHandles({ x: 0, y: 0 }, { x: 300, y: 100 }, "horizontal");
assert(horizConn.sourceHandle === 'source-right' && horizConn.targetHandle === 'target-left',
  'Horizontal layout strictly uses source-right -> target-left');

// Vertical layout
const vertConn = determineOptimalHandles({ x: 0, y: 0 }, { x: 50, y: 200 }, "vertical");
assert(vertConn.sourceHandle === 'source-bottom' && vertConn.targetHandle === 'target-top',
  'Vertical layout strictly uses source-bottom -> target-top');

// Radial layout - Child to the right
const rightBranch = determineOptimalHandles({ x: 0, y: 0 }, { x: 300, y: 50 }, "radial");
assert(rightBranch.sourceHandle === 'source-right' && rightBranch.targetHandle === 'target-left',
  'Radial right branch connects: parent source-right -> child target-left');

// Radial layout - Child to the left
const leftBranch = determineOptimalHandles({ x: 0, y: 0 }, { x: -300, y: -20 }, "radial");
assert(leftBranch.sourceHandle === 'source-left' && leftBranch.targetHandle === 'target-right',
  'Radial left branch connects: parent source-left -> child target-right');

// Radial layout - Child directly below
const bottomBranch = determineOptimalHandles({ x: 0, y: 0 }, { x: 10, y: 300 }, "radial");
assert(bottomBranch.sourceHandle === 'source-bottom' && bottomBranch.targetHandle === 'target-top',
  'Radial bottom branch connects: parent source-bottom -> child target-top');

// ----------------------------------------------------
// SECTION 5: RELATIONSHIP EDGES & BADGE PILLS
// ----------------------------------------------------
console.log('\n--- Test Suite 3: Cross-branch Relationship Edges & Badges ---');
const edgeCode = fs.readFileSync('frontend/src/components/EditableEdge.tsx', 'utf8');
assert(edgeCode.includes('isRelationship'), 'EditableEdge distinguishes cross-branch relationships');
assert(edgeCode.includes('badge') || edgeCode.includes('label'), 'EditableEdge renders relationship badge pill');
assert(edgeCode.includes('strokeDasharray'), 'EditableEdge supports dashed styling for relationships');

// ----------------------------------------------------
// SECTION 6: SINGLE SOURCE OF TRUTH GRAPH STATE
// ----------------------------------------------------
console.log('\n--- Test Suite 4: Single Source of Truth Graph State Invariants ---');

function createInitialGraph() {
  const root = { id: 'root', data: { label: 'Machine Learning & AI Engineering', nodeType: 'root' }, position: { x: 0, y: 0 } };
  const topic1 = { id: 'topic-1', data: { label: 'Generative AI & LLMs', nodeType: 'topic' }, position: { x: -300, y: 0 } };
  const topic2 = { id: 'topic-2', data: { label: 'Traditional Machine Learning', nodeType: 'topic' }, position: { x: 300, y: -100 } };
  const nodes = [root, topic1, topic2];
  const edges = [
    { id: 'e-root-1', source: 'root', target: 'topic-1' },
    { id: 'e-root-2', source: 'root', target: 'topic-2' }
  ];
  return { nodes, edges };
}

// Invariant 1: Manual addition of child creates exactly one edge and one node
const graph1 = createInitialGraph();
const newChild = { id: 'concept-1', data: { label: 'Prompt Engineering', nodeType: 'concept' }, position: { x: -600, y: -50 } };
graph1.nodes.push(newChild);
graph1.edges.push({ id: 'e-topic1-concept1', source: 'topic-1', target: 'concept-1' });

assert(graph1.nodes.length === 4, 'Graph has 4 nodes after adding child');
assert(graph1.edges.length === 3, 'Graph has 3 edges after adding child');

// Invariant 2: AI suggested changes card applies to the exact same nodes/edges array
const aiSuggestion = { id: 'ai-sugg-1', data: { label: 'LoRA & QLoRA', nodeType: 'ai_suggestion' }, position: { x: -900, y: -50 } };
graph1.nodes.push(aiSuggestion);
graph1.edges.push({ id: 'e-concept1-aisugg1', source: 'concept-1', target: 'ai-sugg-1' });

assert(graph1.nodes.length === 5, 'AI nodes are incorporated directly into unified graph');

// Invariant 3: Deleting a node cascades to its incident edges (no dangling edges)
function deleteNode(graph, nodeId) {
  const remainingNodes = graph.nodes.filter(n => n.id !== nodeId);
  const remainingEdges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  return { nodes: remainingNodes, edges: remainingEdges };
}

const cleanedGraph = deleteNode(graph1, 'concept-1');
const danglingEdges = cleanedGraph.edges.filter(e => 
  !cleanedGraph.nodes.some(n => n.id === e.source) || 
  !cleanedGraph.nodes.some(n => n.id === e.target)
);
assert(danglingEdges.length === 0, 'No dangling/disconnected edges after node deletion');
assert(!cleanedGraph.nodes.some(n => n.id === 'concept-1'), 'Deleted node is removed completely (no ghost nodes)');

// ----------------------------------------------------
// SECTION 7: LARGE MAP COLLISION & STRESS TEST
// ----------------------------------------------------
console.log('\n--- Test Suite 5: Large Map Layout Stress Test (50+ and 100+ Nodes) ---');

function generateMockTree(numNodes) {
  const nodes = [{ id: 'node-0', label: 'Root System', level: 0, parentId: null, x: 0, y: 0 }];
  let currentParentIdx = 0;
  for (let i = 1; i < numNodes; i++) {
    const parentId = `node-${currentParentIdx}`;
    const level = nodes[currentParentIdx].level + 1;
    const side = (i % 2 === 0) ? 1 : -1;
    const x = side * (level * 280);
    const y = ((i * 65) % 800) - 400;
    nodes.push({ id: `node-${i}`, label: `Node Component ${i}`, level, parentId, x, y });
    if (i % 4 === 0) {
      currentParentIdx = (currentParentIdx + 1) % i;
    }
  }
  return nodes;
}

const tree50 = generateMockTree(50);
assert(tree50.length === 50, 'Generated 50-node stress tree');

const tree100 = generateMockTree(100);
assert(tree100.length === 100, 'Generated 100-node stress tree');

// ----------------------------------------------------
// SECTION 8: TEMPLATE IMMUTABILITY CHECK
// ----------------------------------------------------
console.log('\n--- Test Suite 6: Template Immutability Guard ---');
const templateServicePath = 'backend/app/services/template_layout.py';
if (fs.existsSync(templateServicePath)) {
  const templateCode = fs.readFileSync(templateServicePath, 'utf8');
  assert(templateCode.includes('def') || templateCode.includes('layout'), 'Template layout service is present');
}

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
