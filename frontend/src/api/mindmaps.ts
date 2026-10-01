import api from "./client";

export interface MindMap {
    id: string;
    project_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMindMapRequest {
    title: string;
}

export interface UpdateMindMapRequest {
    title?: string;
}

export interface MindMapNode {
    id: string;
    mind_map_id: string;
    label: string;
    type: string;
    position_x: number;
    position_y: number;
    created_at: string;
    updated_at: string;
}

export interface MindMapEdge {
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

export interface GenerateAIMindMapRequest {
    topic: string;
    depth?: number;
}

export interface GenerateAIMindMapResponse {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
}

export async function getProjectMindMaps(
    projectId: string,
): Promise<MindMap[]> {
    const response = await api.get<MindMap[]>(
        `/mind-maps/projects/${projectId}/mind-maps`,
    );

    return response.data;
}

export async function getMindMap(
    mindMapId: string,
): Promise<MindMap> {
    const response = await api.get<MindMap>(
        `/mind-maps/${mindMapId}`,
    );

    return response.data;
}

export async function createMindMap(
    projectId: string,
    data: CreateMindMapRequest,
): Promise<MindMap> {
    const response = await api.post<MindMap>(
        `/mind-maps/projects/${projectId}/mind-maps`,
        data,
    );

    return response.data;
}

export async function updateMindMap(
    mindMapId: string,
    data: UpdateMindMapRequest,
): Promise<MindMap> {
    const response = await api.put<MindMap>(
        `/mind-maps/${mindMapId}`,
        data,
    );

    return response.data;
}

export async function deleteMindMap(
    mindMapId: string,
): Promise<void> {
    await api.delete(`/mind-maps/${mindMapId}`);
}

export async function chatMindMap(
    mindMapId: string,
    instruction: string,
    selectedNodeId?: string | null,
): Promise<{ response_text: string, nodes: MindMapNode[], edges: MindMapEdge[] }> {
    const response = await api.post(
        `/mind-maps/${mindMapId}/chat`,
        { instruction, selected_node_id: selectedNodeId }
    );
    return response.data;
}

export async function generateAIMindMap(
    mindMapId: string,
    data: GenerateAIMindMapRequest,
): Promise<GenerateAIMindMapResponse> {
    const response = await api.post<GenerateAIMindMapResponse>(
        `/mind-maps/${mindMapId}/generate`,
        data,
    );

    return response.data;
}


export interface Snapshot {
    id: string;
    mind_map_id: string;
    name: string;
    graph_data: any;
    created_at: string;
}

export async function getSnapshots(mindMapId: string): Promise<Snapshot[]> {
    const response = await api.get<Snapshot[]>(`/mind-maps/${mindMapId}/snapshots`);
    return response.data;
}

export async function createSnapshot(mindMapId: string, name: string): Promise<Snapshot> {
    const response = await api.post<Snapshot>(`/mind-maps/${mindMapId}/snapshots`, { name });
    return response.data;
}

export async function restoreSnapshot(mindMapId: string, snapshotId: string): Promise<{ status: string }> {
    const response = await api.post<{ status: string }>(`/mind-maps/${mindMapId}/snapshots/${snapshotId}/restore`);
    return response.data;
}
