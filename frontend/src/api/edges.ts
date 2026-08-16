import api from "./client";

export interface Edge {
    id: string;
    mind_map_id: string;
    source: string;
    target: string;
    label: string | null;
    type: string;
    animated: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateEdgeRequest {
    source: string;
    target: string;
    label?: string | null;
    type?: string;
    animated?: boolean;
}

export interface UpdateEdgeRequest {
    source?: string;
    target?: string;
    label?: string | null;
    type?: string;
    animated?: boolean;
}

export async function getMindMapEdges(
    mindMapId: string,
): Promise<Edge[]> {
    const response = await api.get<Edge[]>(
        `/edges/mind-maps/${mindMapId}`,
    );

    return response.data;
}

export async function getEdge(
    edgeId: string,
): Promise<Edge> {
    const response = await api.get<Edge>(
        `/edges/${edgeId}`,
    );

    return response.data;
}

export async function createEdge(
    mindMapId: string,
    data: CreateEdgeRequest,
): Promise<Edge> {
    const response = await api.post<Edge>(
        `/edges/mind-maps/${mindMapId}`,
        data,
    );

    return response.data;
}

export async function updateEdge(
    edgeId: string,
    data: UpdateEdgeRequest,
): Promise<Edge> {
    const response = await api.put<Edge>(
        `/edges/${edgeId}`,
        data,
    );

    return response.data;
}

export async function deleteEdge(
    edgeId: string,
): Promise<void> {
    await api.delete(`/edges/${edgeId}`);
}