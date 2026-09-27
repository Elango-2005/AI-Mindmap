import api from "./client";

export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  category: "Engineering" | "Product" | "AI & Data" | "Productivity" | string;
  icon: string;
  badge: string;
  color: string;
  node_count: number;
  topics_preview: string[];
}

export interface TemplateDetail extends TemplateSummary {
  roots: any[];
}

export interface InstantiateTemplateResponse {
  project_id: string;
  mind_map_id: string;
  title: string;
  node_count: number;
  edge_count: number;
}

export async function getTemplates(): Promise<TemplateSummary[]> {
  const response = await api.get<TemplateSummary[]>("/templates");
  return response.data;
}

export async function getTemplate(templateId: string): Promise<TemplateDetail> {
  const response = await api.get<TemplateDetail>(`/templates/${templateId}`);
  return response.data;
}

export async function instantiateTemplate(templateId: string): Promise<InstantiateTemplateResponse> {
  const response = await api.post<InstantiateTemplateResponse>(`/templates/${templateId}/instantiate`);
  return response.data;
}
