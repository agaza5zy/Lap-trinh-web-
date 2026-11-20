import apiClient from './client';

export const getRooms = (params = {}) => apiClient.get('/rooms', { params }).then((r) => r.data);
export const getRoom = (id, params = {}) => apiClient.get(`/rooms/${id}`, { params }).then((r) => r.data);
export const getHotels = () => apiClient.get('/hotels').then((r) => r.data);
