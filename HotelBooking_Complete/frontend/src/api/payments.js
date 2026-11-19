import apiClient from './client';
export const getPaymentConfig = () => apiClient.get('/payments/config').then((r) => r.data);
export const createPayment = (bookingCode, method) => apiClient.post('/payments', { bookingCode, method }).then((r) => r.data);
export const getPaymentStatus = (bookingCode) => apiClient.get(`/payments/booking/${encodeURIComponent(bookingCode)}`).then((r) => r.data);
export const capturePayPal = (orderId, bookingCode) => apiClient.post('/payments/paypal/capture', { orderId, bookingCode }).then((r) => r.data);
