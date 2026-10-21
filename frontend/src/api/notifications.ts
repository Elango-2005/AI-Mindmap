import api from "./client";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  category: "collaboration" | "ai" | "project" | "export" | "account" | "system";
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  project_id?: string | null;
  mind_map_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  extra_metadata?: Record<string, any> | null;
  link?: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationPreferences {
  in_app_enabled: boolean;
  email_enabled: boolean;
  collaboration_enabled: boolean;
  ai_enabled: boolean;
  project_enabled: boolean;
  export_enabled: boolean;
  account_enabled: boolean;
  email_frequency: "important" | "all" | "digest";
  email_provider_configured: boolean;
}

export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
  category?: string;
}): Promise<NotificationListResponse> {
  const response = await api.get("/notifications", { params });
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get("/notifications/unread-count");
    return response.data.unread_count;
  } catch {
    return 0;
  }
}

export async function markAsRead(notificationId: string): Promise<NotificationItem> {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllAsRead(): Promise<{ updated_count: number }> {
  const response = await api.post("/notifications/read-all");
  return response.data;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  await api.delete(`/notifications/${notificationId}`);
  return true;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await api.get("/notifications/preferences");
  return response.data;
}

export async function updateNotificationPreferences(
  updates: Partial<Omit<NotificationPreferences, "email_provider_configured">>
): Promise<NotificationPreferences> {
  const response = await api.patch("/notifications/preferences", updates);
  return response.data;
}

export async function shareMindMap(
  mindMapId: string,
  email: string,
  role: string = "editor"
): Promise<{ success: boolean; message: string }> {
  const response = await api.post(`/mind-maps/${mindMapId}/share`, { email, role });
  return response.data;
}
