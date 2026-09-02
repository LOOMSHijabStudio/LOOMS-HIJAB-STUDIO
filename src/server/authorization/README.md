# Authorization boundary

Privileged operations belong in server-only modules. Future route handlers and
server actions must verify the authenticated session and role before accessing
protected data. The service-role client is isolated in `src/lib/supabase/server.ts`
and must never be imported by client components.
