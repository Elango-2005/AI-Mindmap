import re

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import reconnectEdge
content = content.replace(
    'import { addEdge, type Connection, type Edge as FlowEdge } from "@xyflow/react";',
    'import { addEdge, reconnectEdge, type Connection, type Edge as FlowEdge } from "@xyflow/react";'
)

# Add onReconnect
on_reconnect = """
  const onReconnect = async (oldEdge: FlowEdge, newConnection: Connection) => {
    try {
      await updateEdge(oldEdge.id, {
        source: newConnection.source,
        target: newConnection.target
      });
      setFlowEdges(eds => {
        const next = reconnectEdge(oldEdge, newConnection, eds);
        pushToHistory(flowNodes, next);
        return next;
      });
      toast.success("Edge reconnected");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reconnect edge");
    }
  };
"""
content = content.replace('const onConnect = async', on_reconnect + '\n  const onConnect = async')

# Inject into ReactFlow
content = content.replace(
    'onConnect={onConnect}',
    'onConnect={onConnect}\n              onReconnect={onReconnect}\n              edgesUpdatable={true}'
)

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Edge Reconnect Patch Applied.")
