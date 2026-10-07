import http from 'http';
import type { Express } from 'express';
import app from '../../src/app';

// Rutas que deben ser públicas a propósito. Cualquier ruta nueva fuera de esta lista
// tiene que exigir autenticación: si alguien olvida el middleware, este test falla (A18).
const PUBLIC_ROUTES = new Set([
  'GET /api/health',
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'GET /api/branding',
  'GET /api/branding/logo',
]);

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  handle?: { stack?: Layer[] };
}

function collectRoutes(stack: Layer[], found: { method: string; path: string }[] = []) {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        found.push({ method: method.toUpperCase(), path: layer.route.path });
      }
    } else if (layer.handle?.stack) {
      collectRoutes(layer.handle.stack, found);
    }
  }
  return found;
}

const registeredRoutes = () =>
  collectRoutes((app as unknown as Express & { _router: { stack: Layer[] } })._router.stack).map((r) => ({
    method: r.method,
    // Las rutas cuelgan de /api; los parámetros se sustituyen por un valor cualquiera.
    path: `/api${r.path}`.replace(/:[A-Za-z]+/g, 'x'),
    label: `${r.method} /api${r.path}`,
  }));

describe('protección de rutas (A18)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No address');
      baseUrl = `http://localhost:${address.port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('descubre las rutas registradas (si esto falla, el test dejó de ver la aplicación)', () => {
    expect(registeredRoutes().length).toBeGreaterThan(100);
  });

  it('toda ruta que no es pública rechaza la petición sin token con 401', async () => {
    const unprotected: string[] = [];

    for (const route of registeredRoutes()) {
      if (PUBLIC_ROUTES.has(route.label)) continue;
      const res = await fetch(`${baseUrl}${route.path}`, { method: route.method });
      if (res.status !== 401) unprotected.push(`${route.label} → ${res.status}`);
    }

    expect(unprotected).toEqual([]);
  });

  it('un token inválido tampoco abre ninguna ruta protegida', async () => {
    const open: string[] = [];

    for (const route of registeredRoutes()) {
      if (PUBLIC_ROUTES.has(route.label)) continue;
      const res = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
        headers: { Authorization: 'Bearer token-falso' },
      });
      if (res.status !== 401) open.push(`${route.label} → ${res.status}`);
    }

    expect(open).toEqual([]);
  });
});
