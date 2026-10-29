/**
 * Complete prototype for MindVault Production Layout & Alignment Engine
 */

const fs = require('fs');

// Layout Configuration Constants
const BALANCED_CONFIG = {
  LEVEL_GAP: 280,
  SIBLING_GAP: 24,
  BRANCH_GAP: 48,
  ROOT_GAP: 320,
  MIN_NODE_DISTANCE: 24,
  COLLISION_PADDING: 12,
};

const COMPACT_CONFIG = {
  LEVEL_GAP: 220,
  SIBLING_GAP: 16,
  BRANCH_GAP: 32,
  ROOT_GAP: 250,
  MIN_NODE_DISTANCE: 16,
  COLLISION_PADDING: 8,
};

function measureNodeDimensions(node) {
  if (node.measured && node.measured.width > 0 && node.measured.height > 0) {
    return { width: node.measured.width, height: node.measured.height };
  }

  const label = node.data?.label || node.label || 'Untitled';
  const nodeType = node.data?.semanticType || node.data?.nodeType || node.type || 'concept';
  const hasDesc = Boolean(node.data?.description);
  const hasIcon = Boolean(node.data?.icon || node.data?.visualConfig?.iconName);

  if (nodeType === 'root') {
    const width = Math.min(360, Math.max(200, label.length * 10 + 90));
    const height = 58;
    return { width, height };
  }

  if (nodeType === 'topic') {
    const width = Math.min(320, Math.max(180, label.length * 8.5 + (hasIcon ? 75 : 55)));
    const height = hasDesc ? 78 : 50;
    return { width, height };
  }

  const width = Math.min(290, Math.max(140, label.length * 8 + (hasIcon ? 65 : 45)));
  const height = hasDesc ? 68 : 42;
  return { width, height };
}

function computeLayout(nodes, edges, options = {}) {
  const mode = options.mode || 'radial';
  const config = options.density === 'compact' ? COMPACT_CONFIG : BALANCED_CONFIG;

  if (nodes.length === 0) return { positions: new Map(), edges: [] };

  // 1. Separate Primary Hierarchy from Secondary Relationships
  const nodeMap = new Map();
  const nodeDims = new Map();
  nodes.forEach(n => {
    nodeMap.set(n.id, n);
    nodeDims.set(n.id, measureNodeDimensions(n));
  });

  const isSecondary = (e) => {
    const t = e.data?.edgeType || e.type || e.data?.relationshipType;
    return t === 'relationship' || t === 'ai_suggestion' || e.data?.isRelationship === true;
  };

  const hierarchyEdges = edges.filter(e => !isSecondary(e));
  const secondaryEdges = edges.filter(e => isSecondary(e));

  // 2. Identify Root Node
  const inDegree = new Map();
  const adj = new Map();
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  hierarchyEdges.forEach(e => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target);
      inDegree.set(e.target, inDegree.get(e.target) + 1);
    }
  });

  let rootNode = nodes.find(n => n.data?.semanticType === 'root' || n.type === 'root');
  if (!rootNode) {
    rootNode = nodes.find(n => inDegree.get(n.id) === 0) || nodes[0];
  }

  // 3. Build Acyclic Spanning Tree
  const treeAdj = new Map();
  nodes.forEach(n => treeAdj.set(n.id, []));
  const visited = new Set([rootNode.id]);
  const queue = [rootNode.id];

  while (queue.length > 0) {
    const curr = queue.shift();
    const children = adj.get(curr) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        treeAdj.get(curr).push(childId);
        queue.push(childId);
      }
    }
  }

  // 4. Calculate Subtree Dimensions (Bounding Height / Span)
  const subtreeHeight = new Map();
  function calcSubtreeHeight(nodeId) {
    const children = treeAdj.get(nodeId) || [];
    const dims = nodeDims.get(nodeId);
    if (children.length === 0) {
      subtreeHeight.set(nodeId, dims.height);
      return dims.height;
    }
    const childHeights = children.map(c => calcSubtreeHeight(c));
    const totalChildHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * config.SIBLING_GAP;
    const finalH = Math.max(dims.height, totalChildHeight);
    subtreeHeight.set(nodeId, finalH);
    return finalH;
  }
  calcSubtreeHeight(rootNode.id);

  const positions = new Map();

  // 5. Layout Algorithms
  if (mode === 'radial') {
    // Balanced 2-Sided Radial Layout
    positions.set(rootNode.id, { x: 0, y: 0 });

    const topics = treeAdj.get(rootNode.id) || [];
    if (topics.length > 0) {
      // Partition topics by subtree height into Right and Left hemispheres
      const sortedTopics = [...topics].sort((a, b) => (subtreeHeight.get(b) || 0) - (subtreeHeight.get(a) || 0));
      const rightTopics = [];
      const leftTopics = [];
      let rightH = 0;
      let leftH = 0;

      for (const tid of sortedTopics) {
        if (rightH <= leftH) {
          rightTopics.push(tid);
          rightH += (subtreeHeight.get(tid) || 0) + config.BRANCH_GAP;
        } else {
          leftTopics.push(tid);
          leftH += (subtreeHeight.get(tid) || 0) + config.BRANCH_GAP;
        }
      }

      // Place Branch
      function placeBranch(topicList, sideMultiplier) {
        const totalSpan = topicList.reduce((sum, id) => sum + (subtreeHeight.get(id) || 0), 0) +
          (topicList.length - 1) * config.BRANCH_GAP;
        let cursorY = -totalSpan / 2;

        function placeNodeRecursive(nodeId, depth) {
          const dims = nodeDims.get(nodeId);
          const posX = sideMultiplier * (config.ROOT_GAP + (depth - 1) * config.LEVEL_GAP);
          const children = treeAdj.get(nodeId) || [];

          if (children.length === 0) {
            const posY = cursorY + dims.height / 2;
            cursorY += dims.height + config.SIBLING_GAP;
            positions.set(nodeId, { x: Math.round(posX), y: Math.round(posY) });
            return posY;
          }

          const childYs = children.map(c => placeNodeRecursive(c, depth + 1));
          const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
          positions.set(nodeId, { x: Math.round(posX), y: Math.round(avgY) });
          return avgY;
        }

        topicList.forEach(tid => {
          placeNodeRecursive(tid, 1);
          cursorY += config.BRANCH_GAP;
        });
      }

      placeBranch(rightTopics, 1);
      placeBranch(leftTopics, -1);
    }
  } else if (mode === 'horizontal') {
    // Left-to-Right Horizontal Tree
    positions.set(rootNode.id, { x: 0, y: 0 });
    const branches = treeAdj.get(rootNode.id) || [];
    const totalSpan = branches.reduce((sum, id) => sum + (subtreeHeight.get(id) || 0), 0) +
      (branches.length - 1) * config.BRANCH_GAP;
    let cursorY = -totalSpan / 2;

    function placeHorizontalRecursive(nodeId, depth) {
      const dims = nodeDims.get(nodeId);
      const posX = depth === 0 ? 0 : config.ROOT_GAP + (depth - 1) * config.LEVEL_GAP;
      const children = treeAdj.get(nodeId) || [];

      if (children.length === 0) {
        const posY = cursorY + dims.height / 2;
        cursorY += dims.height + config.SIBLING_GAP;
        positions.set(nodeId, { x: Math.round(posX), y: Math.round(posY) });
        return posY;
      }

      const childYs = children.map(c => placeHorizontalRecursive(c, depth + 1));
      const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
      positions.set(nodeId, { x: Math.round(posX), y: Math.round(avgY) });
      return avgY;
    }

    branches.forEach(b => {
      placeHorizontalRecursive(b, 1);
      cursorY += config.BRANCH_GAP;
    });
  } else if (mode === 'vertical') {
    // Top-to-Bottom Vertical Tree
    positions.set(rootNode.id, { x: 0, y: 0 });
    const branches = treeAdj.get(rootNode.id) || [];
    const totalSpan = branches.reduce((sum, id) => sum + (subtreeHeight.get(id) || 0), 0) +
      (branches.length - 1) * config.BRANCH_GAP;
    let cursorX = -totalSpan / 2;

    function placeVerticalRecursive(nodeId, depth) {
      const dims = nodeDims.get(nodeId);
      const posY = depth === 0 ? 0 : config.ROOT_GAP + (depth - 1) * config.LEVEL_GAP;
      const children = treeAdj.get(nodeId) || [];

      if (children.length === 0) {
        const posX = cursorX + dims.width / 2;
        cursorX += dims.width + config.SIBLING_GAP;
        positions.set(nodeId, { x: Math.round(posX), y: Math.round(posY) });
        return posX;
      }

      const childXs = children.map(c => placeVerticalRecursive(c, depth + 1));
      const avgX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      positions.set(nodeId, { x: Math.round(avgX), y: Math.round(posY) });
      return avgX;
    }

    branches.forEach(b => {
      placeVerticalRecursive(b, 1);
      cursorX += config.BRANCH_GAP;
    });
  }

  // 6. Collision Detection and AABB Resolution Pass
  function resolveCollisions() {
    const positionedList = Array.from(positions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y,
      w: nodeDims.get(id).width,
      h: nodeDims.get(id).height,
    }));

    let overlapsFound = 0;
    const padding = config.COLLISION_PADDING;

    for (let i = 0; i < positionedList.length; i++) {
      for (let j = i + 1; j < positionedList.length; j++) {
        const a = positionedList[i];
        const b = positionedList[j];

        const aLeft = a.x - a.w / 2 - padding;
        const aRight = a.x + a.w / 2 + padding;
        const aTop = a.y - a.h / 2 - padding;
        const aBottom = a.y + a.h / 2 + padding;

        const bLeft = b.x - b.w / 2 - padding;
        const bRight = b.x + b.w / 2 + padding;
        const bTop = b.y - b.h / 2 - padding;
        const bBottom = b.y + b.h / 2 + padding;

        const overlapX = aLeft < bRight && aRight > bLeft;
        const overlapY = aTop < bBottom && aBottom > bTop;

        if (overlapX && overlapY) {
          overlapsFound++;
          const shiftY = (Math.min(aBottom, bBottom) - Math.max(aTop, bTop)) / 2 + config.MIN_NODE_DISTANCE;
          if (a.y <= b.y) {
            positions.get(a.id).y -= Math.round(shiftY);
            positions.get(b.id).y += Math.round(shiftY);
          } else {
            positions.get(a.id).y += Math.round(shiftY);
            positions.get(b.id).y -= Math.round(shiftY);
          }
        }
      }
    }
    return overlapsFound;
  }

  for (let pass = 0; pass < 3; pass++) {
    const collisions = resolveCollisions();
    if (collisions === 0) break;
  }

  // 7. Dynamic Handle Selection
  function determineHandles(sPos, tPos) {
    if (mode === 'horizontal') {
      return { sourceHandle: 'source-right', targetHandle: 'target-left' };
    }
    if (mode === 'vertical') {
      return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
    }
    const dx = tPos.x - sPos.x;
    const dy = tPos.y - sPos.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
      return dx >= 0
        ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
        : { sourceHandle: 'source-left', targetHandle: 'target-right' };
    } else {
      return dy >= 0
        ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
        : { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
    }
  }

  const updatedEdges = edges.map(e => {
    const sPos = positions.get(e.source);
    const tPos = positions.get(e.target);
    if (!sPos || !tPos) return e;
    const handles = determineHandles(sPos, tPos);
    return {
      ...e,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });

  return { positions, edges: updatedEdges };
}

// Execute on Test Map
const testMapNodes = [
  { id: 'root', data: { label: 'Machine Learning & AI Engineering', semanticType: 'root' } },
  { id: 't1', data: { label: 'Data & Feature Store', semanticType: 'topic' } },
  { id: 'c1_1', data: { label: 'Data Cleaning & Normalization', semanticType: 'concept' } },
  { id: 'c1_2', data: { label: 'Feature Engineering & Embeddings', semanticType: 'concept' } },
  { id: 'c1_3', data: { label: 'Data Version Control (DVC)', semanticType: 'concept' } },
  { id: 't2', data: { label: 'Generative AI & LLMs', semanticType: 'topic' } },
  { id: 'c2_1', data: { label: 'Prompt Engineering & Few-Shot', semanticType: 'concept' } },
  { id: 'c2_2', data: { label: 'Retrieval Augmented Generation (RAG)', semanticType: 'concept' } },
  { id: 'c2_3', data: { label: 'Fine-Tuning (LoRA / QLoRA)', semanticType: 'concept' } },
  { id: 't3', data: { label: 'Deep Learning Architectures', semanticType: 'topic' } },
  { id: 'c3_1', data: { label: 'Convolutional Networks (Vision)', semanticType: 'concept' } },
  { id: 'c3_2', data: { label: 'Recurrent Networks (Time Series)', semanticType: 'concept' } },
  { id: 'c3_3', data: { label: 'Transformer & Multi-Head Attention', semanticType: 'concept' } },
  { id: 't4', data: { label: 'Traditional Machine Learning', semanticType: 'topic' } },
  { id: 'c4_1', data: { label: 'Supervised Learning', semanticType: 'concept' } },
  { id: 'c4_2', data: { label: 'Unsupervised Learning & Clustering', semanticType: 'concept' } },
  { id: 'c4_3', data: { label: 'Hyperparameter Optimization', semanticType: 'concept' } },
  { id: 't5', data: { label: 'Production MLOps & Serving', semanticType: 'topic' } },
  { id: 'c5_1', data: { label: 'Model Registry & Tracking', semanticType: 'concept' } },
  { id: 'c5_2', data: { label: 'High-Throughput Inference', semanticType: 'concept' } },
  { id: 'c5_3', data: { label: 'Monitoring & Drift Detection', semanticType: 'concept' } },
];

const testMapEdges = [
  { source: 'root', target: 't1' },
  { source: 't1', target: 'c1_1' },
  { source: 't1', target: 'c1_2' },
  { source: 't1', target: 'c1_3' },
  { source: 'root', target: 't2' },
  { source: 't2', target: 'c2_1' },
  { source: 't2', target: 'c2_2' },
  { source: 't2', target: 'c2_3' },
  { source: 'root', target: 't3' },
  { source: 't3', target: 'c3_1' },
  { source: 't3', target: 'c3_2' },
  { source: 't3', target: 'c3_3' },
  { source: 'root', target: 't4' },
  { source: 't4', target: 'c4_1' },
  { source: 't4', target: 'c4_2' },
  { source: 't4', target: 'c4_3' },
  { source: 'root', target: 't5' },
  { source: 't5', target: 'c5_1' },
  { source: 't5', target: 'c5_2' },
  { source: 't5', target: 'c5_3' },
  { source: 'c2_2', target: 'c1_2', data: { edgeType: 'relationship', label: 'Uses Embeddings' } }
];

console.log('Running Layout Tests...');
['radial', 'horizontal', 'vertical'].forEach(mode => {
  const start = performance.now();
  const res = computeLayout(testMapNodes, testMapEdges, { mode });
  const duration = performance.now() - start;
  console.log(`\nMode: ${mode.toUpperCase()} (computed in ${duration.toFixed(2)}ms)`);

  let overlaps = 0;
  const list = Array.from(res.positions.entries()).map(([id, pos]) => ({
    id,
    x: pos.x,
    y: pos.y,
    dims: measureNodeDimensions(testMapNodes.find(n => n.id === id))
  }));

  list.forEach(item => console.log('    ' + item.id + ': x=' + item.x + ', y=' + item.y + ', w=' + item.dims.width + ', h=' + item.dims.height));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const pad = 4;
      const xOverlap = Math.abs(a.x - b.x) < (a.dims.width + b.dims.width) / 2 + pad;
      const yOverlap = Math.abs(a.y - b.y) < (a.dims.height + b.dims.height) / 2 + pad;
      if (xOverlap && yOverlap) {
        overlaps++;
        console.error(`  [OVERLAP DETECTED] ${a.id} and ${b.id}`);
      }
    }
  }

  console.log(`  Positioned ${res.positions.size} nodes`);
  console.log(`  Overlaps detected: ${overlaps}`);
  if (overlaps === 0) {
    console.log(`  ✓ ZERO collisions in ${mode} mode`);
  }
});
