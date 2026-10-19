import { useEffect, useRef, useState, useCallback } from 'react';
import { NodeChange, EdgeChange, Node, Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface RemoteUser {
  userId: string;
  userName: string;
  cursor?: CursorPosition;
}

export interface NodeUpdateFields {
  label?: string;
  position_x?: number;
  position_y?: number;
  importance_score?: number;
}

export interface NodeCreateData {
  id: string;
  label: string;
  position_x: number;
  position_y: number;
  importance_score?: number;
  type?: string;
}

export interface EdgeCreateData {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
}

interface UseMindMapSyncProps {
  mindMapId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function useMindMapSync({ mindMapId, setNodes, setEdges }: UseMindMapSyncProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isUnmountedRef = useRef<boolean>(false);

  const [remoteUsers, setRemoteUsers] = useState<Record<string, RemoteUser>>({});
  const [isConnected, setIsConnected] = useState(false);

  // Logical clock and tombstones for conflict-free resolution
  const clockRef = useRef<number>(1);
  const tombstonesRef = useRef<Record<string, number>>({});

  const nextClock = useCallback(() => {
    clockRef.current += 1;
    return clockRef.current;
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!mindMapId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//127.0.0.1:8000/api/v1/ws/collaboration/${mindMapId}?token=${token}`;

    function connect() {
      if (isUnmountedRef.current) return;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Connected to collaboration room');
        setIsConnected(true);
      };

      ws.current.onclose = (event) => {
        console.log('Disconnected from collaboration room', event.code);
        setIsConnected(false);
        setRemoteUsers({});

        // Do not reconnect on authorization failure (1008)
        if (event.code !== 1008 && !isUnmountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket collaboration error:', err);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.clock) {
            clockRef.current = Math.max(clockRef.current, Number(message.clock)) + 1;
          }

          switch (message.type) {
            case 'sync_state': {
              const { clock, nodes: syncedNodes, edges: syncedEdges, tombstones, connected_users } = message;
              if (clock) {
                clockRef.current = Math.max(clockRef.current, Number(clock));
              }
              if (tombstones) {
                tombstonesRef.current = { ...tombstonesRef.current, ...tombstones };
              }
              if (connected_users && Array.isArray(connected_users)) {
                const userMap: Record<string, RemoteUser> = {};
                connected_users.forEach((u: any) => {
                  userMap[u.user_id] = { userId: u.user_id, userName: u.user_name };
                });
                setRemoteUsers(userMap);
              }
              // Merge synced nodes
              if (syncedNodes && Array.isArray(syncedNodes)) {
                setNodes((currentNodes) => {
                  const currentMap = new Map(currentNodes.map(n => [n.id, n]));
                  return syncedNodes
                    .filter((n: any) => !tombstonesRef.current[n.id])
                    .map((n: any) => {
                      const existing = currentMap.get(n.id);
                      return {
                        id: n.id,
                        position: { x: n.position_x, y: n.position_y },
                        data: {
                          ...(existing?.data || {}),
                          label: n.label,
                          importance_score: n.importance_score ?? 1.0,
                        },
                        type: existing?.type || n.type || 'editable',
                      };
                    });
                });
              }
              // Merge synced edges
              if (syncedEdges && Array.isArray(syncedEdges)) {
                setEdges((currentEdges) => {
                  const currentMap = new Map(currentEdges.map(e => [e.id, e]));
                  return syncedEdges
                    .filter((e: any) => !tombstonesRef.current[e.id])
                    .map((e: any) => {
                      const existing = currentMap.get(e.id);
                      return {
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        label: e.label,
                        type: existing?.type || e.type || 'editable',
                        animated: e.animated ?? false,
                      };
                    });
                });
              }
              break;
            }

            case 'node_updated': {
              const { node_id, fields, clock } = message;
              if (tombstonesRef.current[node_id] && clock && clock <= tombstonesRef.current[node_id]) {
                break;
              }
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id !== node_id) return n;
                  const updatedData = { ...n.data };
                  if (fields.label !== undefined) updatedData.label = fields.label;
                  if (fields.importance_score !== undefined) updatedData.importance_score = fields.importance_score;
                  const updatedPos = { ...n.position };
                  if (fields.position_x !== undefined) updatedPos.x = fields.position_x;
                  if (fields.position_y !== undefined) updatedPos.y = fields.position_y;
                  return {
                    ...n,
                    position: updatedPos,
                    data: updatedData,
                  };
                })
              );
              break;
            }

            case 'node_created': {
              const { node, clock } = message;
              if (tombstonesRef.current[node.id] && clock && clock <= tombstonesRef.current[node.id]) {
                break;
              }
              setNodes((nds) => {
                if (nds.some((n) => n.id === node.id)) return nds;
                const newFlowNode: Node = {
                  id: node.id,
                  position: { x: node.position_x ?? 0, y: node.position_y ?? 0 },
                  data: {
                    label: node.label,
                    importance_score: node.importance_score ?? 1.0,
                  },
                  type: node.type || 'editable',
                };
                return [...nds, newFlowNode];
              });
              break;
            }

            case 'node_deleted': {
              const { node_id, pruned_edge_ids, clock } = message;
              tombstonesRef.current[node_id] = clock || clockRef.current;
              setNodes((nds) => nds.filter((n) => n.id !== node_id));
              setEdges((eds) =>
                eds.filter(
                  (e) =>
                    e.source !== node_id &&
                    e.target !== node_id &&
                    (!pruned_edge_ids || !pruned_edge_ids.includes(e.id))
                )
              );
              break;
            }

            case 'edge_created': {
              const { edge, clock } = message;
              if (tombstonesRef.current[edge.id] && clock && clock <= tombstonesRef.current[edge.id]) {
                break;
              }
              if (tombstonesRef.current[edge.source] || tombstonesRef.current[edge.target]) {
                break;
              }
              setEdges((eds) => {
                if (eds.some((e) => e.id === edge.id)) return eds;
                const newFlowEdge: Edge = {
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  label: edge.label,
                  type: edge.type || 'editable',
                  animated: edge.animated || false,
                };
                return [...eds, newFlowEdge];
              });
              break;
            }

            case 'edge_deleted': {
              const { edge_id, clock } = message;
              tombstonesRef.current[edge_id] = clock || clockRef.current;
              setEdges((eds) => eds.filter((e) => e.id !== edge_id));
              break;
            }

            case 'ai_graph_merged': {
              const { nodes: aiNodes, edges: aiEdges } = message;
              if (aiNodes && Array.isArray(aiNodes)) {
                setNodes((currentNodes) => {
                  const currentMap = new Map(currentNodes.map(n => [n.id, n]));
                  return aiNodes
                    .filter((n: any) => !tombstonesRef.current[n.id])
                    .map((n: any) => {
                      const existing = currentMap.get(n.id);
                      return {
                        id: n.id,
                        position: existing ? existing.position : { x: n.position_x || 0, y: n.position_y || 0 },
                        data: {
                          ...(existing?.data || {}),
                          label: n.label,
                          importance_score: n.importance_score ?? 1.0,
                        },
                        type: existing?.type || n.type || 'editable',
                      };
                    });
                });
              }
              if (aiEdges && Array.isArray(aiEdges)) {
                setEdges((currentEdges) => {
                  const currentMap = new Map(currentEdges.map(e => [e.id, e]));
                  return aiEdges
                    .filter((e: any) => !tombstonesRef.current[e.id])
                    .map((e: any) => {
                      const existing = currentMap.get(e.id);
                      return {
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        label: e.label,
                        type: existing?.type || e.type || 'editable',
                        animated: e.animated ?? false,
                      };
                    });
                });
              }
              break;
            }

            case 'user_joined': {
              setRemoteUsers(prev => ({
                ...prev,
                [message.user_id]: {
                  userId: message.user_id,
                  userName: message.user_name
                }
              }));
              break;
            }

            case 'user_left': {
              setRemoteUsers(prev => {
                const next = { ...prev };
                delete next[message.user_id];
                return next;
              });
              break;
            }

            case 'cursor_move': {
              setRemoteUsers(prev => {
                if (!prev[message.user_id]) return prev;
                return {
                  ...prev,
                  [message.user_id]: {
                    ...prev[message.user_id],
                    cursor: message.cursor
                  }
                };
              });
              break;
            }

            // Fallback backward-compatibility handlers
            case 'nodes_change': {
              setNodes((nds) => applyNodeChanges(message.changes, nds));
              break;
            }

            case 'edges_change': {
              setEdges((eds) => applyEdgeChanges(message.changes, eds));
              break;
            }

            case 'node_text_update': {
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id === message.nodeId) {
                    return { ...n, data: { ...n.data, label: message.label } };
                  }
                  return n;
                })
              );
              break;
            }
          }
        } catch (e) {
          console.error('Error parsing websocket message', e);
        }
      };
    }

    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [mindMapId, setNodes, setEdges]);

  // Broadcast Actions
  const broadcastNodeUpdate = useCallback((nodeId: string, fields: NodeUpdateFields) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'node_update',
        node_id: nodeId,
        fields,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastNodeCreate = useCallback((node: NodeCreateData) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'node_create',
        node,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastNodeDelete = useCallback((nodeId: string) => {
    tombstonesRef.current[nodeId] = clockRef.current;
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'node_delete',
        node_id: nodeId,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastEdgeCreate = useCallback((edge: EdgeCreateData) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'edge_create',
        edge,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastEdgeDelete = useCallback((edgeId: string) => {
    tombstonesRef.current[edgeId] = clockRef.current;
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'edge_delete',
        edge_id: edgeId,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastCursorMove = useCallback((cursor: CursorPosition) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'cursor_move', cursor }));
    }
  }, []);

  const broadcastNodesChange = useCallback((changes: NodeChange[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'nodes_change',
        changes,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'edges_change',
        changes,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const broadcastNodeTextUpdate = useCallback((nodeId: string, label: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'node_text_update',
        nodeId,
        label,
        clock: nextClock(),
      }));
    }
  }, [nextClock]);

  const requestSync = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'sync_request' }));
    }
  }, []);

  return {
    isConnected,
    remoteUsers,
    broadcastNodeUpdate,
    broadcastNodeCreate,
    broadcastNodeDelete,
    broadcastEdgeCreate,
    broadcastEdgeDelete,
    broadcastCursorMove,
    broadcastNodesChange,
    broadcastEdgesChange,
    broadcastNodeTextUpdate,
    requestSync,
  };
}
