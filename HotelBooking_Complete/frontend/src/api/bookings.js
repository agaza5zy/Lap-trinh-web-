import apiClient from './client';
export const createBooking = (data) => apiClient.post('/bookings', data).then((r) => r.data);
export const getMyBookings = () => apiClient.get('/bookings/my').then((r) => r.data);
export const cancelBooking = (id) => apiClient.patch(`/bookings/${id}/cancel`).then((r) => r.data);
export const lookupBooking = (code, email) => apiClient.get(`/bookings/lookup/${encodeURIComponent(code)}`, { params: { email } }).then((r) => r.data);
