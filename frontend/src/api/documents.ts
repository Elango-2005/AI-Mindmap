import api from "./client";

export interface ProjectDocument {
    id: string;
    project_id: string;
    filename: string;
    file_type: string;
    file_size_bytes: number;
    chunk_count: number;
    created_at: string;
}

export interface DocumentSearchResult {
    chunk_id: string;
    document_id: string;
    filename: string;
    page_number?: number | null;
    score: number;
    text: string;
}

export interface DocumentSearchResponse {
    query: string;
    results: DocumentSearchResult[];
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<ProjectDocument> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<ProjectDocument>(
        `/projects/${projectId}/documents/upload`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response.data;
}

export async function listProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    const response = await api.get<ProjectDocument[]>(`/projects/${projectId}/documents`);
    return response.data;
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/documents/${documentId}`);
}

export async function searchProjectKnowledge(
    projectId: string,
    query: string,
    topK = 5
): Promise<DocumentSearchResponse> {
    const response = await api.post<DocumentSearchResponse>(
        `/projects/${projectId}/documents/search`,
        { query, top_k: topK }
    );
    return response.data;
}
