function request(method, url, body) {
  return fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(r => (r.status === 204 ? null : r.json()));
}

export const get = url => request('GET', url);
export const post = (url, body) => request('POST', url, body || {});
export const patch = (url, body) => request('PATCH', url, body || {});
export const del = url => request('DELETE', url);
