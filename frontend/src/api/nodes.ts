import api from "./client";

export interface Node {
    id: string;
    mind_map_id: string;
    label: string;
    type: string;
    position_x: number;
    position_y: number;
    created_at: string;
    updated_at: string;
}

export interface CreateNodeRequest {
    label: string;
    type?: string;
    position_x?: number;
    position_y?: number;
}

export interface UpdateNodeRequest {
    label?: string;
    type?: string;
    position_x?: number;
    position_y?: number;
}

export async function getMindMapNodes(
    mindMapId: string,
): Promise<Node[]> {
    const response = await api.get<Node[]>(
        `/nodes/mind-maps/${mindMapId}`,
    );

    return response.data;
}

export async function getNode(
    nodeId: string,
): Promise<Node> {
    const response = await api.get<Node>(
        `/nodes/${nodeId}`,
    );

    return response.data;
}

export async function createNode(
    mindMapId: string,
    data: CreateNodeRequest,
): Promise<Node> {
    const response = await api.post<Node>(
        `/nodes/mind-maps/${mindMapId}`,
        data,
    );

    return response.data;
}

export async function updateNode(
    nodeId: string,
    data: UpdateNodeRequest,
): Promise<Node> {
    const response = await api.put<Node>(
        `/nodes/${nodeId}`,
        data,
    );

    return response.data;
}

export async function deleteNode(
    nodeId: string,
): Promise<void> {
    await api.delete(`/nodes/${nodeId}`);
}

export async function summarizeNode(
    nodeId: string,
): Promise<{ summary: string }> {
    const response = await api.post<{ summary: string }>(
        `/nodes/${nodeId}/summarize`
    );
    return response.data;
}