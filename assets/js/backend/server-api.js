// Same-origin API. Auth tokens stay in the server's HttpOnly-cookie session.
export async function serverRequest(path, body) {
    const response = await fetch('/api/' + path, {
        credentials: 'same-origin', headers: {
            'Content-Type': 'application/json'
        }, ...(body === undefined ? {} : {
            method: 'POST', body: JSON.stringify(body)
        })
    });
    const result = await response.json();
    if (!response.ok)
        throw Error(result.error || 'Request failed');
    return result;
}
