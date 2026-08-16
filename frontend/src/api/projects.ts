import api from "./client";

export interface Project {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectRequest {
    title: string;
    description?: string | null;
    thumbnail?: string | null;
}

export interface UpdateProjectRequest {
    title?: string;
    description?: string | null;
    thumbnail?: string | null;
}

export async function getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");
    return response.data;
}

export async function getProject(projectId: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
}

export async function createProject(
    data: CreateProjectRequest,
): Promise<Project> {
    const response = await api.post<Project>("/projects", data);
    return response.data;
}

export async function updateProject(
    projectId: string,
    data: UpdateProjectRequest,
): Promise<Project> {
    const response = await api.put<Project>(
        `/projects/${projectId}`,
        data,
    );
    return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
}