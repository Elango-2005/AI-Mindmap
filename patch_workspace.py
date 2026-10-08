import re

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import createEdge, deleteEdge
content = content.replace(
    'import { getMindMapEdges } from "@/api/edges";',
    'import { getMindMapEdges, deleteEdge, createEdge, updateEdge } from "@/api/edges";\nimport { addEdge, type Connection, type Edge as FlowEdge } from "@xyflow/react";'
)

# 2. Add onPushHistory to node data
old_mapped_nodes = """return {
          id: node.id,
          position: hasStoredPosition ? { x: node.position_x, y: node.position_y } : { x: 0, y: 0 },
          data: {
            label: node.label,
            mindMapId,
            onDelete: () => setConfirmAction({ type: 'delete', nodeId: node.id, nodeLabel: node.label }),
            onRegenerate: () => setConfirmAction({ type: 'regenerate', nodeId: node.id, nodeLabel: node.label })
          },
          type: "editable",
        };"""

new_mapped_nodes = """return {
          id: node.id,
          position: hasStoredPosition ? { x: node.position_x, y: node.position_y } : { x: 0, y: 0 },
          data: {
            label: node.label,
            mindMapId,
            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),
            onDelete: (id?: string) => {
               if (id) {
                   // From context menu, silent delete (managed by standard ReactFlow handlers via onNodesDelete)
                   // wait, context menu calls onDelete(id). 
                   // We actually just want to open the prompt OR just delete it.
                   // User wants to be able to delete a node manually.
                   // The safe AI regeneration rule means if they delete manually it shouldn't be terrifying, but the backend is safe.
                   // Actually, if we pass id, let's just trigger the confirmAction for deletion to be safe, or just do it.
                   // Standard React Flow selection + Backspace works. We will just use standard selection + backspace for quick delete.
                   setConfirmAction({ type: 'delete', nodeId: id, nodeLabel: node.label });
               } else {
                   setConfirmAction({ type: 'delete', nodeId: node.id, nodeLabel: node.label });
               }
            },
            onRegenerate: () => setConfirmAction({ type: 'regenerate', nodeId: node.id, nodeLabel: node.label })
          },
          type: "editable",
        };"""
content = content.replace(old_mapped_nodes, new_mapped_nodes)

# 3. Add onConnect and handleNodeDragStop
on_connect_func = """
  const onConnect = async (connection: Connection) => {
    if (!mindMapId) return;
    try {
      const newEdge = await createEdge(mindMapId, {
        source: connection.source,
        target: connection.target
      });
      const rfEdge: FlowEdge = {
        id: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        type: "editable"
      };
      setFlowEdges(eds => {
        const next = addEdge(rfEdge, eds);
        pushToHistory(flowNodes, next);
        return next;
      });
      toast.success("Connected nodes");
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect nodes");
    }
  };

  const handleNodeDragStop: NodeDragHandler = async (_e, node) => {
    try {
      await updateNode(node.id, { position_x: node.position.x, position_y: node.position.y });
      setFlowNodes(current => {
        pushToHistory(current, flowEdges);
        return current;
      });
    } catch (error) { console.error(error); }
  };
"""

# Replace old drag stop
old_drag_stop = """  const handleNodeDragStop: NodeDragHandler = async (_e, node) => {
    try {
      await updateNode(node.id, { position_x: node.position.x, position_y: node.position.y });
    } catch (error) { console.error(error); }
  };"""

content = content.replace(old_drag_stop, on_connect_func)

# 4. Handle onNodesDelete and onEdgesDelete
on_deletes = """
  const handleNodesDelete = async (deleted: FlowNode[]) => {
    try {
      await Promise.all(deleted.map(n => deleteNode(n.id)));
      setFlowNodes(current => {
        pushToHistory(current, flowEdges);
        return current;
      });
    } catch(e) { console.error(e); }
  };

  const handleEdgesDelete = async (deleted: FlowEdge[]) => {
    try {
      await Promise.all(deleted.map(e => deleteEdge(e.id)));
      setFlowEdges(current => {
        pushToHistory(flowNodes, current);
        return current;
      });
    } catch(e) { console.error(e); }
  };

  function handleNodesChange(changes: NodeChange[]) {
"""
content = content.replace("  function handleNodesChange(changes: NodeChange[]) {", on_deletes)

# 5. Update ReactFlow component
rf_old = """<ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setRfInstance}
              fitView
              nodesDraggable={true}
              elementsSelectable={true}
              onNodesChange={handleNodesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
            >"""

rf_new = """<ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setRfInstance}
              fitView
              nodesDraggable={true}
              elementsSelectable={true}
              nodesConnectable={true}
              deleteKeyCode={['Backspace', 'Delete']}
              onConnect={onConnect}
              onNodesDelete={handleNodesDelete}
              onEdgesDelete={handleEdgesDelete}
              onNodesChange={handleNodesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
            >"""
content = content.replace(rf_old, rf_new)

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
