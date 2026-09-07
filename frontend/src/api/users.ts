import api from "./client";

export interface UserUpdateData {
    full_name?: string;
}

export async function updateProfile(data: UserUpdateData) {
    const response = await api.put("/users/me", data);
    return response.data;
}

export async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await api.post("/users/me/avatar", formData);
    return response.data;
}
