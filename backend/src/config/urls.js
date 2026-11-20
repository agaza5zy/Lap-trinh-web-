function normalizeOrigin(value) {
  const candidate = String(value || '').split(',')[0].trim();
  if (!candidate) return '';
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`).origin;
  } catch {
    return '';
  }
}

export function getAppUrl() {
  return normalizeOrigin(process.env.CLIENT_URL)
    || normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    || normalizeOrigin(process.env.VERCEL_URL)
    || 'http://localhost:5173';
}

export function getApiUrl() {
  return normalizeOrigin(process.env.API_PUBLIC_URL)
    || normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    || normalizeOrigin(process.env.VERCEL_URL)
    || 'http://localhost:5000';
}
