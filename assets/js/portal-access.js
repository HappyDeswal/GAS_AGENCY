// Portal intent never grants a role: only active memberships returned by the database do.
export function portalForRole(role) {
    if (['owner', 'admin'].includes(role)) return 'owner';
    if (role === 'delivery') return 'delivery';
    return null;
}
export function selectLoginMembership(members, requested = '', preferredAgency = '') {
    if (!['', 'owner', 'delivery'].includes(requested)) throw Error('Choose a valid login portal.');
    const eligible = members.filter(m => portalForRole(m.role) && (!requested || portalForRole(m.role) === requested));
    const member = eligible.find(m => m.agency_id === preferredAgency) || eligible[0];
    if (!member) throw Error(requested ? 'This account does not have access to the selected portal. Use the other login or contact your agency owner.' : 'No supported agency membership. Contact your agency owner.');
    return member;
}
