# Phoenix — Extractor de Configuración SAP S/4HANA Public Cloud

Lee toda la configuración accesible del tenant Public Cloud vía APIs OData
públicas y la documenta en archivos JSON + Markdown. **Solo lectura.**

- **Tenant objetivo:** `my413724` (Payless ShoeSource)
- **Usuario:** `CFELIPE`
- **Output:** carpeta `output/` (un JSON por entidad + reporte legible)

## Requisitos

- Node.js 18+ (probado con Node 22). Usa `fetch` nativo y `--env-file`.
- Credenciales del tenant (usuario + password) con roles de lectura.

## Setup

1. Copiar el ejemplo de entorno y completar credenciales:

   ```bash
   cp .env.example .env
   # editar .env y poner S4_PASS, confirmar S4_BASE_URL y S4_CLIENT
   ```

   `.env` está en `.gitignore` — **nunca se commitea**.

2. Probar conectividad y credenciales (prueba 3 URLs base candidatas):

   ```bash
   npm run test:conn
   # equivalente: node --env-file=.env test-connection.js
   ```

   - `HTTP 200` → todo OK, seguir.
   - `HTTP 401` → usuario/clave inválidos o se requiere Communication User.
   - `HTTP 403` → falta algún rol.
   - `HTTP 404` → esa API no está activada (el extractor lo tolera).
   - Network/DNS → la URL base es incorrecta o no hay acceso de red.

## Ejecutar la extracción

```bash
npm run extract
# equivalente: node --env-file=.env extract.js
```

Recorre las ~25 APIs del catálogo, pagina automáticamente (500 por página),
tolera APIs no disponibles y genera en `output/`:

```
output/
├── 00_FULL_EXTRACT.json     ← todo junto (summary maestro)
├── 00_CONFIG_REPORT.md      ← reporte ejecutivo legible
└── <domain>__<name>.json    ← un archivo por entidad
```

## Descubrir más APIs

```bash
npm run test:conn   # primero confirmá conexión
node --env-file=.env discover-services.js
```

Lista los servicios OData activos en el tenant. Agregá los que interesen
al array `APIS` en `extract.js`.

## Alcance (lo que NO hace)

- No toca Private Cloud (DS4/050).
- No escribe nada en SAP — es 100% lectura.
- No lee tablas SAP directamente (no permitido en Public Cloud).
