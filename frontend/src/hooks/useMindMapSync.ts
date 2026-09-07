import { useEffect, useRef, useState, useCallback } from 'react';
import { NodeChange, EdgeChange, Node, Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

interface CursorPosition {
  x: number;
  y: number;
}

export interface RemoteUser {
  userId: string;
  userName: string;
  cursor?: CursorPosition;
}

interface UseMindMapSyncProps {
  mindMapId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function useMindMapSync({ mindMapId, setNodes, setEdges }: UseMindMapSyncProps) {
  const ws = useRef<WebSocket | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, RemoteUser>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!mindMapId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//127.0.0.1:8000/api/v1/ws/collaboration/${mindMapId}?token=${token}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to collaboration room');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from collaboration room');
      setIsConnected(false);
      setRemoteUsers({});
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'user_joined':
            setRemoteUsers(prev => ({
              ...prev,
              [message.user_id]: {
                userId: message.user_id,
                userName: message.user_name
              }
            }));
            break;
            
          case 'user_left':
            setRemoteUsers(prev => {
              const next = { ...prev };
              delete next[message.user_id];
              return next;
            });
            break;
            
          case 'cursor_move':
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
            
          case 'nodes_change':
            setNodes((nds) => applyNodeChanges(message.changes, nds));
            break;
            
          case 'edges_change':
            setEdges((eds) => applyEdgeChanges(message.changes, eds));
            break;
            
          case 'node_text_update':
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
      } catch (e) {
        console.error('Error parsing websocket message', e);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [mindMapId, setNodes, setEdges]);

  const broadcastNodesChange = useCallback((changes: NodeChange[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'nodes_change', changes }));
    }
  }, []);

  const broadcastEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'edges_change', changes }));
    }
  }, []);

  const broadcastCursorMove = useCallback((cursor: CursorPosition) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'cursor_move', cursor }));
    }
  }, []);
  
  const broadcastNodeTextUpdate = useCallback((nodeId: string, label: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'node_text_update', nodeId, label }));
    }
  }, []);

  return {
    isConnected,
    remoteUsers,
    broadcastNodesChange,
    broadcastEdgesChange,
    broadcastCursorMove,
    broadcastNodeTextUpdate
  };
}
