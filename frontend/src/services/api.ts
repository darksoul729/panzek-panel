import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
});

export const authApi = {
    check: () => api.get('/auth/check'),
    login: (credentials: any) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
};

export const systemApi = {
    getStats: () => Promise.all([
        api.get('/system/info'),
        api.get('/system/cpu'),
        api.get('/system/memory'),
        api.get('/system/disk'),
    ]).then(([info, cpu, mem, disk]) => ({
        info: info.data,
        cpu: cpu.data,
        mem: mem.data,
        disk: disk.data,
    })),
    getLogs: () => api.get('/logs/activity'),
};

export const servicesApi = {
    list: () => api.get('/services/list'),
    control: (name: string, action: string) => api.post(`/services/control?action=${action}`, { name }),
    create: (service: any) => api.post('/services', service),
    delete: (id: number) => api.delete(`/services/${id}`),
};

export const sitesApi = {
    list: () => api.get('/sites/list'),
    create: (site: any) => api.post('/sites', site),
    delete: (id: number) => api.delete(`/sites/${id}`),
    control: (id: number, action: string) => api.post(`/sites/${id}/control?action=${action}`),
};

export default api;
