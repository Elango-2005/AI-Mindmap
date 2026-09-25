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
