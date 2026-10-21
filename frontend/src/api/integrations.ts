import api from "./client";

export type IntegrationFormat = "markdown" | "opml" | "freemind" | "xmind";

export async function exportMindMap(mindMapId: string, format: IntegrationFormat): Promise<Blob> {
  const response = await api.get(`/integrations/export/${mindMapId}?format=${format}`, {
    responseType: "blob",
  });
  return response.data;
}

export async function importMindMap(mindMapId: string, format: IntegrationFormat, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("format", format);
  formData.append("file", file);

  const response = await api.post(`/integrations/import/${mindMapId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// MindMeister Direct Cloud API
// ---------------------------------------------------------------------------

export interface MindMeisterStatus {
  configured: boolean;
  connected: boolean;
  provider: string;
  account_id: string | null;
  account_name: string | null;
  account_email: string | null;
  expires_at: string | null;
}

export interface MindMeisterMap {
  id: string;
  title: string;
  modified?: string;
  created?: string;
  web_url?: string;
}

export interface MindMeisterExportResponse {
  status: string;
  message: string;
  mm_map_id: string;
  web_url: string;
}

export interface MindMeisterImportResponse {
  status: string;
  message: string;
  mind_map_id: string;
  mm_map_id: string;
}

export async function getMindMeisterStatus(): Promise<MindMeisterStatus> {
  const response = await api.get<MindMeisterStatus>("/integrations/mindmeister/status");
  return response.data;
}

export async function getMindMeisterAuthUrl(): Promise<{ auth_url: string; configured: boolean }> {
  const response = await api.get<{ auth_url: string; configured: boolean }>("/integrations/mindmeister/auth-url");
  return response.data;
}

export async function disconnectMindMeister(): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>("/integrations/mindmeister/disconnect");
  return response.data;
}

export async function getMindMeisterMaps(): Promise<{ maps: MindMeisterMap[] }> {
  const response = await api.get<{ maps: MindMeisterMap[] }>("/integrations/mindmeister/maps");
  return response.data;
}

export async function importMindMeisterMap(mindMapId: string, mmMapId: string): Promise<MindMeisterImportResponse> {
  const response = await api.post<MindMeisterImportResponse>(`/integrations/mindmeister/import/${mindMapId}`, {
    mm_map_id: mmMapId,
  });
  return response.data;
}

export async function exportMindMeisterMap(mindMapId: string): Promise<MindMeisterExportResponse> {
  const response = await api.post<MindMeisterExportResponse>(`/integrations/mindmeister/export/${mindMapId}`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Coggle Direct Cloud API
// ---------------------------------------------------------------------------

export interface CoggleStatus {
  configured: boolean;
  connected: boolean;
  provider: string;
  account_id: string | null;
  account_name: string | null;
  account_email: string | null;
  expires_at: string | null;
}

export interface CoggleDiagram {
  id: string;
  title: string;
  updated?: string;
  web_url?: string;
}

export interface CoggleExportResponse {
  status: string;
  message: string;
  coggle_diagram_id: string;
  web_url: string;
}

export interface CoggleImportResponse {
  status: string;
  message: string;
  mind_map_id: string;
  coggle_diagram_id: string;
}

export async function getCoggleStatus(): Promise<CoggleStatus> {
  const response = await api.get<CoggleStatus>("/integrations/coggle/status");
  return response.data;
}

export async function getCoggleAuthUrl(): Promise<{ auth_url: string; configured: boolean }> {
  const response = await api.get<{ auth_url: string; configured: boolean }>("/integrations/coggle/auth-url");
  return response.data;
}

export async function disconnectCoggle(): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>("/integrations/coggle/disconnect");
  return response.data;
}

export async function getCoggleDiagrams(): Promise<{ diagrams: CoggleDiagram[] }> {
  const response = await api.get<{ diagrams: CoggleDiagram[] }>("/integrations/coggle/diagrams");
  return response.data;
}

export async function importCoggleDiagram(mindMapId: string, diagramId: string): Promise<CoggleImportResponse> {
  const response = await api.post<CoggleImportResponse>(`/integrations/coggle/import/${mindMapId}`, {
    diagram_id: diagramId,
  });
  return response.data;
}

export async function exportCoggleDiagram(mindMapId: string): Promise<CoggleExportResponse> {
  const response = await api.post<CoggleExportResponse>(`/integrations/coggle/export/${mindMapId}`);
  return response.data;
}
