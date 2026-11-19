import apiClient from './client';
export const getRooms = (params = {}) => apiClient.get('/rooms', { params }).then((r) => r.data);
export const getRoom = (id) => apiClient.get(`/rooms/${id}`).then((r) => r.data);
export const getHotels = () => apiClient.get('/hotels').then((r) => r.data);
