import { createBackendClient } from './client.js';
const tables = new Set(['customers', 'staff', 'cylinder_types', 'stock_balances', 'staff_stock', 'deliveries', 'delivery_events', 'stock_movements', 'payments', 'settlements', 'settlement_events']);
const metadata = new Set(['customers', 'staff', 'cylinder_types']);
const operations = new Set(['receive_stock', 'create_delivery', 'transition_delivery', 'return_empty_stock', 'record_payment', 'review_settlement', 'adjust_stock']);
const isUUID = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
// Tenant filters improve query clarity. Database RLS is the actual authorization boundary.
export function createAgencyRepository(agencyId, client = createBackendClient()) {
    if (!isUUID(agencyId))
        throw new Error('A valid agency UUID is required.');
    return Object.freeze({
        async list(table, { limit = 50, offset = 0 } = {}) {
            if (!tables.has(table))
                throw new Error('Unsupported agency table.');
            if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0)
                throw new Error('Use a page size of 1–100 and a non-negative offset.');
            return client.request(`/rest/v1/${table}`, {
                query: {
                    agency_id: `eq.${agencyId}`, select: '*', limit, offset
                }
            });
        },
        async createMetadata(table, values) {
            if (!metadata.has(table))
                throw new Error('Ledger and delivery writes require a backend operation.');
            const { agency_id, id, ...fields } = values;
            return client.request(`/rest/v1/${table}`, {
                method: 'POST', body: {
                    ...fields, agency_id: agencyId
                }
            });
        },
        async updateMetadata(table, id, values) {
            if (!metadata.has(table) || !isUUID(id))
                throw new Error('Valid metadata table and UUID required.');
            const { agency_id, id: ignored, ...fields } = values;
            return client.request(`/rest/v1/${table}`, {
                method: 'PATCH', query: {
                    id: `eq.${id}`, agency_id: `eq.${agencyId}`
                }, body: fields
            });
        },
        async operation(name, parameters) {
            if (!operations.has(name))
                throw new Error('Unsupported agency operation.');
            return client.request(`/rest/v1/rpc/${name}`, {
                method: 'POST', body: {
                    ...parameters, p_agency_id: agencyId
                }
            });
        }
    });
}
