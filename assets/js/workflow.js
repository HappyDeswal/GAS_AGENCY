// One business-operation layer for forms. The demo adapter and a future/live adapter
// must obey the same rules; pages never need to invent inventory/payment rules.
import { data, saveDemo, nextId, prices, sampleDate } from './demo-data.js';
let backend = null;
export function useWorkflowBackend(adapter) {
    backend = adapter;
}
const requireRecord = (records, id, label) => {
    const record = records.find(r => r.id === id);
    if (!record)
        throw Error(label + ' not found.');
    return record;
};
const integer = (value, min = 1, max = 10000) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max)
        throw Error(`Enter a whole number between ${min} and ${max}.`);
    return n;
};
export function deliveryAmount(delivery) {
    return (delivery.unitPrice ?? prices[delivery.size]) * delivery.qty;
}
function movement(type, size, qty, date = sampleDate, delivery) {
    data.movements.push({
        id: nextId('MOV', data.movements), date, size, qty, type, delivery, status: 'Completed', from: type === 'Receive' ? 'Supplier' : type === 'Dispatch' ? 'Godown' : type === 'Delivered' ? 'Delivery team' : 'Customer', to: type === 'Receive' ? 'Godown' : type === 'Dispatch' ? 'Delivery team' : type === 'Delivered' ? 'Customer' : 'Delivery team'
    });
}
export function staffFullStock(size) {
    return data.movements.filter(m => m.size === size).reduce((sum, m) => sum + (['Dispatch'].includes(m.type) ? m.qty : ['Return', 'Delivered'].includes(m.type) ? -m.qty : 0), 0);
}
export async function runWorkflow(name, values) {
    if (backend)
        return backend.execute(name, values);
    let result;
    switch (name) {
        case 'saveCustomer': {
            const name = values.name?.trim(), address = values.address?.trim();
            if (!name || !address)
                throw Error('Customer name and address required.');
            result = {
                ...values, name, address, id: nextId('CUS', data.customers), mobile: 'XXXXX XXXXX', status: 'Active'
            };
            data.customers.push(result);
            break;
        }
        case 'saveStaff': {
            if (!values.name?.trim())
                throw Error('Staff name required.');
            if (values.id) {
                result = requireRecord(data.staff, values.id, 'Staff');
                Object.assign(result, values);
            }
            else {
                result = {
                    ...values, id: nextId('STF', data.staff), contact: 'XXXXX XXXXX'
                };
                data.staff.push(result);
            }
            break;
        }
        case 'reviewSettlement': {
            requireRecord(data.staff, values.staff, 'Staff');
            const submitted = Number(values.submitted);
            const deliveries = data.deliveries.filter(d => d.staff === values.staff);
            const cash = data.payments.filter(p => p.status === 'Paid' && p.method === 'Cash' && p.date === values.date && deliveries.some(d => d.id === p.delivery)).reduce((sum, p) => sum + p.amount, 0);
            if (!Number.isFinite(submitted) || submitted < 0 || submitted > cash)
                throw Error('Submitted cash must be between zero and the recorded collection.');
            result = data.settlements.find(s => s.staff === values.staff && s.date === values.date);
            const fields = {
                staff: values.staff, date: values.date, submitted, status: submitted === cash ? 'Settled' : 'Pending'
            };
            if (result)
                Object.assign(result, fields);
            else {
                result = {
                    id: nextId('SET', data.settlements), ...fields
                };
                data.settlements.push(result);
            }
            break;
        }
        case 'returnEmpties': {
            requireRecord(data.staff, values.staff, 'Staff');
            const qty = integer(values.qty);
            const held = data.movements.filter(m => m.size === values.size).reduce((sum, m) => sum + (m.type === 'Empty exchange' && data.deliveries.some(d => d.id === m.delivery && d.staff === values.staff) ? m.qty : m.type === 'Empty return' && m.staff === values.staff ? -m.qty : 0), 0);
            if (qty > held)
                throw Error('Insufficient empty cylinders held by this partner.');
            data.movements.push({
                id: nextId('MOV', data.movements), date: sampleDate, size: values.size, qty, type: 'Empty return', from: 'Delivery team', to: 'Godown', status: 'Completed', staff: values.staff
            });
            break;
        }
        case 'receiveStock': {
            const stock = requireRecord(data.stock.map(s => ({
                ...s, id: s.size
            })), values.size, 'Cylinder size');
            const qty = integer(values.qty);
            data.stock.find(s => s.size === stock.size).full += qty;
            movement('Receive', values.size, qty, values.date);
            break;
        }
        case 'createDelivery': {
            const qty = integer(values.qty, 1, 20);
            if (requireRecord(data.customers, values.customer, 'Customer').status !== 'Active')
                throw Error('Choose an active customer.');
            const person = requireRecord(data.staff, values.staff, 'Staff');
            if (person.status !== 'Active')
                throw Error('Assign an active staff member.');
            const stock = data.stock.find(s => s.size === values.size);
            if (!stock)
                throw Error('Choose a cylinder size.');
            if (stock.full - stock.reserve - staffFullStock(values.size) < qty)
                throw Error('Insufficient available godown stock.');
            if (!values.address?.trim() || !values.date)
                throw Error('Delivery address and date are required.');
            result = {
                ...values, id: nextId('DEL', data.deliveries), qty, unitPrice: prices[values.size], status: 'Assigned', payment: 'Pending', timeline: [{
                        status: 'Assigned', date: values.date
                    }]
            };
            data.deliveries.push(result);
            movement('Dispatch', values.size, qty, values.date, result.id);
            break;
        }
        case 'transitionDelivery': {
            const d = requireRecord(data.deliveries, values.id, 'Delivery');
            const status = values.status;
            if (d.status === status)
                return d;
            const allowed = {
                Pending: ['In Progress', 'Failed', 'Cancelled'], Assigned: ['In Progress', 'Failed', 'Cancelled'], 'In Progress': ['Delivered', 'Failed', 'Cancelled'], Failed: ['Assigned', 'Cancelled']
            };
            if (!allowed[d.status]?.includes(status))
                throw Error('This delivery status transition is not allowed.');
            if (status === 'Cancelled' && d.payment === 'Paid')
                throw Error('A paid delivery needs a refund review before cancellation.');
            const stock = data.stock.find(s => s.size === d.size);
            if (status === 'Delivered') {
                const empties = integer(values.emptyReturned ?? 0, 0, d.qty);
                // Older sample deliveries predate the ledger. Track allocation for new deliveries only.
                if (data.movements.some(m => m.delivery === d.id && m.type === 'Dispatch')) {
                    if (stock.full < d.qty || staffFullStock(d.size) < d.qty)
                        throw Error('Inventory cannot cover this delivery.');
                    stock.full -= d.qty;
                    movement('Delivered', d.size, d.qty, sampleDate, d.id);
                }
                stock.empty += empties;
                if (empties)
                    movement('Empty exchange', d.size, empties, sampleDate, d.id);
            }
            if (status === 'Cancelled' && data.movements.some(m => m.delivery === d.id && m.type === 'Dispatch') && staffFullStock(d.size) < d.qty)
                throw Error('Partner stock must be reconciled before cancellation.');
            if (status === 'Cancelled' && data.movements.some(m => m.delivery === d.id && m.type === 'Dispatch')) {
                data.movements.push({
                    id: nextId('MOV', data.movements), date: sampleDate, size: d.size, qty: d.qty, type: 'Return', from: 'Delivery team', to: 'Godown', status: 'Completed', delivery: d.id
                });
            }
            d.status = status;
            d.timeline.push({
                status, date: sampleDate
            });
            result = d;
            break;
        }
        case 'recordPayment': {
            const d = requireRecord(data.deliveries, values.delivery, 'Delivery');
            if (d.status !== 'Delivered')
                throw Error('Complete the delivery before recording collection.');
            if (d.payment === 'Paid')
                throw Error('This delivery is already paid.');
            if (!['Cash', 'UPI'].includes(values.method))
                throw Error('Choose Cash or UPI.');
            const status = values.status || 'Paid';
            if (!['Paid', 'Pending', 'Failed'].includes(status))
                throw Error('Unknown payment status.');
            result = {
                id: nextId('PAY', data.payments), ...values, status, amount: deliveryAmount(d)
            };
            data.payments.push(result);
            d.payment = status;
            d.method = values.method;
            const settlement = data.settlements.find(s => s.staff === d.staff && s.date === values.date);
            if (status === 'Paid' && settlement)
                settlement.status = 'Pending';
            break;
        }
        case 'adjustStock': {
            const stock = data.stock.find(s => s.size === values.size);
            if (!stock)
                throw Error('Cylinder size not found.');
            const qty = integer(values.qty);
            const category = values.category;
            if (!['damaged', 'missing'].includes(category))
                throw Error('Choose damaged or missing.');
            if (!values.reason?.trim() || values.reason.trim().length < 3)
                throw Error('An adjustment reason is required.');
            if (stock.full - stock.reserve - staffFullStock(stock.size) < qty)
                throw Error('Only available godown full cylinders can be adjusted.');
            stock.full -= qty;
            stock[category] += qty;
            data.movements.push({
                id: nextId('MOV', data.movements), date: sampleDate, size: stock.size, qty, type: category === 'damaged' ? 'Damaged' : 'Missing', from: 'Godown full stock', to: category, status: 'Completed', reason: values.reason
            });
            break;
        }
        default: throw Error('Unsupported workflow operation.');
    }
    saveDemo();
    return result;
}
export function customerBalances() {
    return data.customers.map(customer => {
        const completed = data.deliveries.filter(d => d.customer === customer.id && d.status === 'Delivered');
        const invoiced = completed.reduce((sum, d) => sum + deliveryAmount(d), 0);
        const collected = data.payments.filter(p => p.status === 'Paid' && completed.some(d => d.id === p.delivery)).reduce((sum, p) => sum + p.amount, 0);
        return {
            customer: customer.id, name: customer.name, invoiced, collected, outstanding: Math.max(0, invoiced - collected)
        };
    });
}
export function dailyClosing(date) {
    const change = m => m.type === 'Receive' ? m.qty : ['Delivered', 'Damaged', 'Missing'].includes(m.type) ? -m.qty : 0;
    const total = data.stock.reduce((sum, s) => sum + s.full, 0);
    const closing = total - data.movements.filter(m => m.date > date).reduce((sum, m) => sum + change(m), 0);
    const movements = data.movements.filter(m => m.date === date);
    const received = movements.filter(m => m.type === 'Receive').reduce((s, m) => s + m.qty, 0);
    const issued = movements.filter(m => m.type === 'Delivered').reduce((s, m) => s + m.qty, 0);
    const adjustments = movements.filter(m => ['Damaged', 'Missing'].includes(m.type)).reduce((s, m) => s + m.qty, 0);
    const paid = data.payments.filter(p => p.status === 'Paid' && p.date === date);
    const cash = paid.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0), upi = paid.filter(p => p.method === 'UPI').reduce((s, p) => s + p.amount, 0);
    const submitted = data.settlements.filter(s => s.date === date).reduce((s, r) => s + r.submitted, 0);
    return {
        date, openingFull: closing - received + issued + adjustments, receivedFull: received, deliveredFull: issued, adjustedFull: adjustments, closingFull: closing, cashCollected: cash, upiCollected: upi, cashSubmitted: submitted, cashOutstanding: cash - submitted
    };
}
