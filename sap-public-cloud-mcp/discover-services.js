// discover-services.js
// Lista los servicios/EntitySets OData activos en el tenant para descubrir más APIs.
// Ejecutar: node --env-file=.env discover-services.js

const BASE = process.env.S4_BASE_URL;
const USER = process.env.S4_USER;
const PASS = process.env.S4_PASS;
const CLIENT = process.env.S4_CLIENT || '100';

if (!BASE || !USER || !PASS) {
  console.error('❌ Faltan variables. Completá .env (S4_BASE_URL, S4_USER, S4_PASS).');
  process.exit(1);
}

const AUTH = Buffer.from(`${USER}:${PASS}`).toString('base64');
const HEADERS = {
  'Authorization': `Basic ${AUTH}`,
  'Accept': 'application/json',
  'sap-client': CLIENT
};

(async () => {
  const url = `${BASE}/sap/opu/odata/sap/?$format=json`;
  console.log(`\n🔍 Listando catálogo OData en ${BASE}\n`);
  let res;
  try {
    res = await fetch(url, { headers: HEADERS });
  } catch (e) {
    console.error(`🌐 Network error: ${e.message}`);
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`❌ HTTP ${res.status} ${res.statusText}`);
    process.exit(2);
  }
  const json = await res.json();
  const services = json?.d?.results ?? json?.d?.EntitySets ?? json?.value ?? [];
  if (!services.length) {
    console.log('Sin resultados (puede que el catálogo raíz no esté expuesto en este tenant).');
    return;
  }
  services.forEach(s => {
    const id = typeof s === 'string' ? s : (s.ID ?? s.Title ?? s.name ?? JSON.stringify(s));
    console.log(`  • ${id}`);
  });
  console.log(`\nTotal: ${services.length} servicios`);
})();
