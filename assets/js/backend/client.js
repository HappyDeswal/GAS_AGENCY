import { backendConfig } from './config.js';
export class BackendError extends Error {
    constructor(message, status = 0, code = '') {
        super(message);
        this.name = 'BackendError';
        this.status = status;
        this.code = code;
    }
}
export function createBackendClient(config = backendConfig, getAccessToken = async () => null) {
    function requireConfiguration() {
        if (!config.enabled || !config.supabaseUrl || !config.publishableKey) {
            throw new BackendError('Backend is not configured. The application is still in demo mode.');
        }
        const url = new URL(config.supabaseUrl);
        const isLocal = ['127.0.0.1', 'localhost'].includes(url.hostname);
        if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
            throw new BackendError('Use HTTPS for a hosted Supabase project.');
        }
        if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
            throw new BackendError('Use the project origin URL without credentials, a path, or query parameters.');
        }
        // Both the new secret keys and legacy service-role JWTs must stay server-side.
        if (config.publishableKey.startsWith('sb_secret_'))
            throw new BackendError('A secret key cannot be used in browser configuration.');
        if (config.publishableKey.split('.').length === 3) {
            try {
                const payload = config.publishableKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                if (JSON.parse(atob(payload)).role === 'service_role')
                    throw new BackendError('A service-role key cannot be used in the browser.');
            }
            catch (error) {
                if (error instanceof BackendError)
                    throw error;
            }
        }
    }
    async function request(path, { method = 'GET', body, query, authenticated = true } = {}) {
        requireConfiguration();
        if (!path.startsWith('/rest/v1/') && !path.startsWith('/auth/v1/'))
            throw new BackendError('Unsupported backend path.');
        const headers = {
            apikey: config.publishableKey, 'Content-Type': 'application/json'
        };
        if (authenticated) {
            const accessToken = await getAccessToken();
            if (!accessToken)
                throw new BackendError('Sign in before accessing agency records.', 401);
            headers.Authorization = `Bearer ${accessToken}`;
        }
        if (method !== 'GET')
            headers.Prefer = 'return=representation';
        const url = new URL(path, config.supabaseUrl);
        if (query)
            for (const [key, value] of Object.entries(query))
                if (value !== undefined)
                    url.searchParams.set(key, String(value));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, {
                method, headers, signal: controller.signal, ...(body === undefined ? {} : {
                    body: JSON.stringify(body)
                })
            });
            const text = await response.text();
            let result;
            try {
                result = text ? JSON.parse(text) : null;
            }
            catch {
                throw new BackendError('The backend returned an unexpected response.', response.status);
            }
            if (!response.ok)
                throw new BackendError(response.status === 401 ? 'Your session has expired. Please sign in again.' : result?.message || result?.msg || 'The backend request failed.', response.status, result?.code || '');
            return result;
        }
        catch (error) {
            if (error instanceof BackendError)
                throw error;
            throw new BackendError(error.name === 'AbortError' ? 'The backend request timed out.' : 'Could not reach the backend. Check your connection.');
        }
        finally {
            clearTimeout(timer);
        }
    }
    return Object.freeze({
        request,
        // Tokens are returned to an injected auth layer, never saved by this adapter.
        signIn: (email, password) => request('/auth/v1/token', {
            method: 'POST', query: {
                grant_type: 'password'
            }, body: {
                email, password
            }, authenticated: false
        }),
        refreshSession: refreshToken => request('/auth/v1/token', {
            method: 'POST', query: {
                grant_type: 'refresh_token'
            }, body: {
                refresh_token: refreshToken
            }, authenticated: false
        }),
        getCurrentUser: () => request('/auth/v1/user'),
        signOut: () => request('/auth/v1/logout', {
            method: 'POST'
        })
    });
}
