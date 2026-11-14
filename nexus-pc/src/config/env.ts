const trimSlash = (url: string) => url.replace(/\/+$/, '');

/** Mọi API đi qua gateway; đường dẫn các service bắt đầu từ /api/v1 */
export const API_BASE_URL = trimSlash(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1');

export const KEYCLOAK_URL = trimSlash(import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180');
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'pcshop';
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'pcshop-web';

export const KEYCLOAK_REALM_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
