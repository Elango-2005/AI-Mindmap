import api from "./client";

export async function register(data: {
    full_name: string;
    email: string;
    password: string;
}) {
    const response = await api.post("/auth/register", data);
    return response.data;
}

export async function login(data: {
    email: string;
    password: string;
}) {
    const response = await api.post("/auth/login", data);
    return response.data;
}

export async function getCurrentUser() {
    const response = await api.get("/auth/me");
    return response.data;
}