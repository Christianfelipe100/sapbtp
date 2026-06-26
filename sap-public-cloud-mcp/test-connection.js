// test-connection.js
// Verifica conectividad y credenciales antes de extraer.
// Ejecutar: node --env-file=.env test-connection.js

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

// URL base candidatas a probar si la principal falla
const CANDIDATES = [
  BASE,
  'https://my413724.s4hana.ondemand.com',
  'https://my413724-api.s4hana.cloud.sap'
];

const TEST_PATH =
  '/sap/opu/odata/sap/API_PLANT_SRV/A_Plant?$top=3&$format=json';

async function probe(base) {
  const url = `${base}${TEST_PATH}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    const status = `HTTP ${res.status} ${res.statusText}`;
    let hint = '';
    if (res.status === 200) hint = '✅ OK — credenciales y URL correctas';
    else if (res.status === 401) hint = '🔑 401 — usuario/clave inválidos o se requiere Communication User';
    else if (res.status === 403) hint = '🚫 403 — falta algún rol/autorización';
    else if (res.status === 404) hint = '❓ 404 — API no activada en este tenant';
    else hint = '⚠️ respuesta inesperada';
    return { base, ok: res.status === 200, status, hint };
  } catch (e) {
    return { base, ok: false, status: `Network error: ${e.message}`, hint: '🌐 DNS/conexión — URL base incorrecta o sin acceso de red' };
  }
}

(async () => {
  console.log(`\n🔍 Probando conectividad (cliente ${CLIENT}, usuario ${USER})\n`);
  let success = false;
  for (const base of CANDIDATES) {
    process.stdout.write(`   ${base} ... `);
    const r = await probe(base);
    console.log(`${r.status}\n      ${r.hint}`);
    if (r.ok) {
      success = true;
      if (base !== BASE) {
        console.log(`\n⚠️  La URL que funciona NO es la de tu .env.`);
        console.log(`    Actualizá S4_BASE_URL a: ${base}`);
      }
      break;
    }
  }
  console.log('');
  process.exit(success ? 0 : 2);
})();
