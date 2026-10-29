/**
 * MindVault Algorithmic Layout Engine - Pure Mathematical Formulation
 */

const BALANCED_CONFIG = {
  LEVEL_GAP: 70,       // Gap between node borders across levels
  SIBLING_GAP: 24,     // Gap between sibling node borders
  BRANCH_GAP: 48,      // Gap between top-level branch boundaries
  ROOT_GAP: 90,        // Gap between root border and level 1 border
  MIN_NODE_DISTANCE: 20
};

function measureNode(node) {
  if (node.measured && node.measured.width > 0 && node.measured.height > 0) {
    return { width: node.measured.width, height: node.measured.height };
  }
  const label = node.data?.label || node.label || 'Untitled';
  const nodeType = node.data?.semanticType || node.data?.nodeType || node.type || 'concept';
  const hasDesc = Boolean(node.data?.description);
  const hasIcon = Boolean(node.data?.icon || node.data?.visualConfig?.iconName);

  if (nodeType === 'root') {
    return { width: Math.min(360, Math.max(200, label.length * 10 + 90)), height: 58 };
  }
  if (nodeType === 'topic') {
    return { width: Math.min(320, Math.max(180, label.length * 8.5 + (hasIcon ? 75 : 55))), height: hasDesc ? 78 : 50 };
  }
  return { width: Math.min(290, Math.max(140, label.length * 8 + (hasIcon ? 65 : 45))), height: hasDesc ? 68 : 42 };
}

function runTidyMindMapLayout(nodes, edges, mode = 'radial', config = BALANCED_CONFIG) {
  if (nodes.length === 0) return { positions: new Map(), edges: [] };

  // 1. Separate hierarchy from secondary relationships
  const nodeMap = new Map();
  const dimsMap = new Map();
  nodes.forEach(n => {
    nodeMap.set(n.id, n);
    dimsMap.set(n.id, measureNode(n));
  });

  const isSecondary = (e) => {
    const t = e.data?.edgeType || e.type || e.data?.relationshipType;
    return t === 'relationship' || t === 'ai_suggestion' || e.data?.isRelationship === true;
  };
  const hierarchyEdges = edges.filter(e => !isSecondary(e));
  const secondaryEdges = edges.filter(e => isSecondary(e));

  // 2. Identify Root
  const adj = new Map();
  const inDegree = new Map();
  nodes.forEach(n => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });
  hierarchyEdges.forEach(e => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target);
      inDegree.set(e.target, inDegree.get(e.target) + 1);
    }
  });

  let root = nodes.find(n => n.data?.semanticType === 'root' || n.type === 'root');
  if (!root) {
    root = nodes.find(n => inDegree.get(n.id) === 0) || nodes[0];
  }

  // 3. Build Acyclic Spanning Tree
  const treeAdj = new Map();
  nodes.forEach(n => treeAdj.set(n.id, []));
  const visited = new Set([root.id]);
  const queue = [root.id];
  while (queue.length > 0) {
    const curr = queue.shift();
    const children = adj.get(curr) || [];
    for (const c of children) {
      if (!visited.has(c)) {
        visited.add(c);
        treeAdj.get(curr).push(c);
        queue.push(c);
      }
    }
  }

  // 4. Calculate Subtree Heights Bottom-Up
  const subtreeHeight = new Map();
  function computeSubtreeHeight(nodeId) {
    const children = treeAdj.get(nodeId) || [];
    const selfH = dimsMap.get(nodeId).height;
    if (children.length === 0) {
      subtreeHeight.set(nodeId, selfH);
      return selfH;
    }
    const childTotalH = children.reduce((sum, c) => sum + computeSubtreeHeight(c), 0) +
      (children.length - 1) * config.SIBLING_GAP;
    const finalH = Math.max(selfH, childTotalH);
    subtreeHeight.set(nodeId, finalH);
    return finalH;
  }
  computeSubtreeHeight(root.id);

  // 5. Measure Maximum Node Width at each depth level to guarantee zero horizontal collision
  const levelMaxWidth = new Map();
  function recordLevelWidth(nodeId, depth) {
    const w = dimsMap.get(nodeId).width;
    levelMaxWidth.set(depth, Math.max(levelMaxWidth.get(depth) || 0, w));
    (treeAdj.get(nodeId) || []).forEach(c => recordLevelWidth(c, depth + 1));
  }
  recordLevelWidth(root.id, 0);

  // Function to get clean X coordinate for depth
  function getDepthX(depth) {
    if (depth === 0) return 0;
    let x = (levelMaxWidth.get(0) / 2) + config.ROOT_GAP + (levelMaxWidth.get(1) / 2);
    for (let d = 2; d <= depth; d++) {
      x += (levelMaxWidth.get(d - 1) / 2) + config.LEVEL_GAP + (levelMaxWidth.get(d) / 2);
    }
    return Math.round(x);
  }

  const positions = new Map();

  // 6. Placement Implementation
  if (mode === 'radial') {
    positions.set(root.id, { x: 0, y: 0 });
    const topics = treeAdj.get(root.id) || [];

    if (topics.length > 0) {
      // Balanced Partitioning using Subtree Heights
      const sortedTopics = [...topics].sort((a, b) => (subtreeHeight.get(b) || 0) - (subtreeHeight.get(a) || 0));
      const rightTopics = [];
      const leftTopics = [];
      let rightH = 0;
      let leftH = 0;

      for (const t of sortedTopics) {
        if (rightH <= leftH) {
          rightTopics.push(t);
          rightH += (subtreeHeight.get(t) || 0) + config.BRANCH_GAP;
        } else {
          leftTopics.push(t);
          leftH += (subtreeHeight.get(t) || 0) + config.BRANCH_GAP;
        }
      }

      function layoutHemisphere(topicList, sideMultiplier) {
        const totalSpan = topicList.reduce((sum, tid) => sum + (subtreeHeight.get(tid) || 0), 0) +
          (topicList.length - 1) * config.BRANCH_GAP;
        let cursorY = -totalSpan / 2;

        function placeNodeSubtree(nodeId, depth, startY, allocatedSpan) {
          const children = treeAdj.get(nodeId) || [];
          const selfX = sideMultiplier * getDepthX(depth);
          const selfH = dimsMap.get(nodeId).height;

          if (children.length === 0) {
            const selfY = startY + allocatedSpan / 2;
            positions.set(nodeId, { x: selfX, y: Math.round(selfY) });
            return selfY;
          }

          // Distribute allocatedSpan among children proportionally
          const childrenTotalH = children.reduce((sum, c) => sum + (subtreeHeight.get(c) || 0), 0) +
            (children.length - 1) * config.SIBLING_GAP;
          let childCursorY = startY + (allocatedSpan - childrenTotalH) / 2;

          const childYs = [];
          for (const c of children) {
            const cH = subtreeHeight.get(c) || 0;
            const cY = placeNodeSubtree(c, depth + 1, childCursorY, cH);
            childYs.push(cY);
            childCursorY += cH + config.SIBLING_GAP;
          }

          const selfY = (childYs[0] + childYs[childYs.length - 1]) / 2;
          positions.set(nodeId, { x: selfX, y: Math.round(selfY) });
          return selfY;
        }

        topicList.forEach(tid => {
          const tH = subtreeHeight.get(tid) || 0;
          placeNodeSubtree(tid, 1, cursorY, tH);
          cursorY += tH + config.BRANCH_GAP;
        });
      }

      layoutHemisphere(rightTopics, 1);
      layoutHemisphere(leftTopics, -1);
    }
  } else if (mode === 'horizontal') {
    positions.set(root.id, { x: 0, y: 0 });
    const branches = treeAdj.get(root.id) || [];
    const totalSpan = branches.reduce((sum, tid) => sum + (subtreeHeight.get(tid) || 0), 0) +
      (branches.length - 1) * config.BRANCH_GAP;
    let cursorY = -totalSpan / 2;

    function placeHorizontalSubtree(nodeId, depth, startY, allocatedSpan) {
      const children = treeAdj.get(nodeId) || [];
      const selfX = getDepthX(depth);

      if (children.length === 0) {
        const selfY = startY + allocatedSpan / 2;
        positions.set(nodeId, { x: selfX, y: Math.round(selfY) });
        return selfY;
      }

      const childrenTotalH = children.reduce((sum, c) => sum + (subtreeHeight.get(c) || 0), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      let childCursorY = startY + (allocatedSpan - childrenTotalH) / 2;

      const childYs = [];
      for (const c of children) {
        const cH = subtreeHeight.get(c) || 0;
        const cY = placeHorizontalSubtree(c, depth + 1, childCursorY, cH);
        childYs.push(cY);
        childCursorY += cH + config.SIBLING_GAP;
      }

      const selfY = (childYs[0] + childYs[childYs.length - 1]) / 2;
      positions.set(nodeId, { x: selfX, y: Math.round(selfY) });
      return selfY;
    }

    branches.forEach(b => {
      const bH = subtreeHeight.get(b) || 0;
      placeHorizontalSubtree(b, 1, cursorY, bH);
      cursorY += bH + config.BRANCH_GAP;
    });
  } else if (mode === 'vertical') {
    // For vertical: width is the horizontal span, depth is along Y
    // Compute Subtree Widths Bottom-Up
    const subtreeWidth = new Map();
    function computeSubtreeWidth(nodeId) {
      const children = treeAdj.get(nodeId) || [];
      const selfW = dimsMap.get(nodeId).width;
      if (children.length === 0) {
        subtreeWidth.set(nodeId, selfW);
        return selfW;
      }
      const childTotalW = children.reduce((sum, c) => sum + computeSubtreeWidth(c), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      const finalW = Math.max(selfW, childTotalW);
      subtreeWidth.set(nodeId, finalW);
      return finalW;
    }
    computeSubtreeWidth(root.id);

    const levelMaxHeight = new Map();
    function recordLevelHeight(nodeId, depth) {
      const h = dimsMap.get(nodeId).height;
      levelMaxHeight.set(depth, Math.max(levelMaxHeight.get(depth) || 0, h));
      (treeAdj.get(nodeId) || []).forEach(c => recordLevelHeight(c, depth + 1));
    }
    recordLevelHeight(root.id, 0);

    function getDepthY(depth) {
      if (depth === 0) return 0;
      let y = (levelMaxHeight.get(0) / 2) + config.ROOT_GAP + (levelMaxHeight.get(1) / 2);
      for (let d = 2; d <= depth; d++) {
        y += (levelMaxHeight.get(d - 1) / 2) + config.LEVEL_GAP + (levelMaxHeight.get(d) / 2);
      }
      return Math.round(y);
    }

    positions.set(root.id, { x: 0, y: 0 });
    const branches = treeAdj.get(root.id) || [];
    const totalSpan = branches.reduce((sum, bid) => sum + (subtreeWidth.get(bid) || 0), 0) +
      (branches.length - 1) * config.BRANCH_GAP;
    let cursorX = -totalSpan / 2;

    function placeVerticalSubtree(nodeId, depth, startX, allocatedSpan) {
      const children = treeAdj.get(nodeId) || [];
      const selfY = getDepthY(depth);

      if (children.length === 0) {
        const selfX = startX + allocatedSpan / 2;
        positions.set(nodeId, { x: Math.round(selfX), y: selfY });
        return selfX;
      }

      const childrenTotalW = children.reduce((sum, c) => sum + (subtreeWidth.get(c) || 0), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      let childCursorX = startX + (allocatedSpan - childrenTotalW) / 2;

      const childXs = [];
      for (const c of children) {
        const cW = subtreeWidth.get(c) || 0;
        const cX = placeVerticalSubtree(c, depth + 1, childCursorX, cW);
        childXs.push(cX);
        childCursorX += cW + config.SIBLING_GAP;
      }

      const selfX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      positions.set(nodeId, { x: Math.round(selfX), y: selfY });
      return selfX;
    }

    branches.forEach(b => {
      const bW = subtreeWidth.get(b) || 0;
      placeVerticalSubtree(b, 1, cursorX, bW);
      cursorX += bW + config.BRANCH_GAP;
    });
  }

  // Determine edge handles
  function getHandles(sPos, tPos) {
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
    const h = getHandles(sPos, tPos);
    return {
      ...e,
      sourceHandle: h.sourceHandle,
      targetHandle: h.targetHandle,
    };
  });

  return { positions, edges: updatedEdges };
}

// ----------------------------------------------------
// RUN VERIFICATION ACROSS TEST MAP (21 NODES)
// ----------------------------------------------------
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

console.log('Testing Mathematical Tidy Tree Mind Map Layout...');
['radial', 'horizontal', 'vertical'].forEach(mode => {
  const t0 = performance.now();
  const res = runTidyMindMapLayout(testMapNodes, testMapEdges, mode);
  const dt = performance.now() - t0;
  console.log(`\n========================================`);
  console.log(`MODE: ${mode.toUpperCase()} (computed in ${dt.toFixed(3)}ms)`);
  console.log(`========================================`);

  const list = Array.from(res.positions.entries()).map(([id, pos]) => ({
    id,
    x: pos.x,
    y: pos.y,
    dims: measureNode(testMapNodes.find(n => n.id === id))
  }));

  let collisions = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const buffer = 4; // 4px buffer
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
        console.error(`  [COLLISION] ${a.id} [${aLeft.toFixed(0)}, ${aRight.toFixed(0)}, ${aTop.toFixed(0)}, ${aBottom.toFixed(0)}] overlaps with ${b.id} [${bLeft.toFixed(0)}, ${bRight.toFixed(0)}, ${bTop.toFixed(0)}, ${bBottom.toFixed(0)}]`);
      }
    }
  }

  console.log(`Positioned ${list.length} nodes`);
  console.log(`Collisions detected: ${collisions}`);
  if (collisions === 0) {
    console.log(`✓ 100% COLLISION-FREE in ${mode.toUpperCase()}!`);
  }
});
