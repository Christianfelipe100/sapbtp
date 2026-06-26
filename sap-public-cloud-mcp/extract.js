// extract.js
// Extractor de configuración SAP S/4HANA Public Cloud vía APIs OData públicas.
// Ejecutar: node --env-file=.env extract.js

import fs from 'fs';
import path from 'path';

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

// ──────────────────────────────────────────────
// CATÁLOGO DE APIs A EXTRAER
// Agregar más a medida que se descubran.
// ──────────────────────────────────────────────
const APIS = [
  // ORG STRUCTURE
  { domain: '01_org_structure', name: 'plants', label: 'Plantas (Werke)', path: '/sap/opu/odata/sap/API_PLANT_SRV/A_Plant' },
  { domain: '01_org_structure', name: 'company_codes', label: 'Company Codes', path: '/sap/opu/odata/sap/API_COMPANYCODE_SRV/A_CompanyCode' },
  { domain: '01_org_structure', name: 'purchasing_orgs', label: 'Purchasing Organizations', path: '/sap/opu/odata/sap/API_PURCHASING_ORGANIZATION_SRV/A_PurchasingOrganization' },
  { domain: '01_org_structure', name: 'purchasing_groups', label: 'Purchasing Groups', path: '/sap/opu/odata/sap/API_PURCHASING_ORGANIZATION_SRV/A_PurchasingGroup' },
  { domain: '01_org_structure', name: 'storage_locations', label: 'Storage Locations', path: '/sap/opu/odata/sap/API_STORAGELOCATION_SRV/A_StorageLocation' },
  { domain: '01_org_structure', name: 'sales_organizations', label: 'Sales Organizations', path: '/sap/opu/odata/sap/API_SALES_ORGANIZATION_SRV/A_SalesOrganization' },
  { domain: '01_org_structure', name: 'distribution_channels', label: 'Distribution Channels', path: '/sap/opu/odata/sap/API_DISTRIBUTION_CHANNEL_SRV/A_DistributionChannel' },
  { domain: '01_org_structure', name: 'divisions', label: 'Divisions', path: '/sap/opu/odata/sap/API_DIVISION_SRV/A_Division' },

  // FINANCE CONFIG
  { domain: '02_finance', name: 'gl_accounts', label: 'G/L Accounts', path: '/sap/opu/odata/sap/API_GLACCOUNT_SRV/A_GLAccountInChartOfAccounts' },
  { domain: '02_finance', name: 'cost_centers', label: 'Cost Centers', path: '/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter' },
  { domain: '02_finance', name: 'profit_centers', label: 'Profit Centers', path: '/sap/opu/odata/sap/API_PROFITCENTER_SRV/A_ProfitCenter' },
  { domain: '02_finance', name: 'currencies', label: 'Currencies', path: '/sap/opu/odata/sap/API_CURRENCY_SRV/A_Currency' },
  { domain: '02_finance', name: 'exchange_rates', label: 'Exchange Rates', path: '/sap/opu/odata/sap/API_EXCHANGERATE_SRV/A_ExchangeRate' },

  // TAX
  { domain: '03_tax', name: 'tax_codes', label: 'Tax Codes', path: '/sap/opu/odata/sap/API_TAX_SRV/A_TaxCode' },

  // MASTER DATA CONFIG
  { domain: '04_master_data', name: 'uom', label: 'Units of Measure', path: '/sap/opu/odata/sap/API_UOM_SRV/A_UnitOfMeasure' },
  { domain: '04_master_data', name: 'uom_mapping_custom', label: 'UoM Mapping Custom (YY1)', path: '/sap/opu/odata/sap/YY1_MAP_UOM_CDS/YY1_MAP_UOM' },
  { domain: '04_master_data', name: 'material_types', label: 'Material Types', path: '/sap/opu/odata/sap/API_MATERIALTYPE_SRV/A_MaterialType' },
  { domain: '04_master_data', name: 'material_groups', label: 'Material Groups', path: '/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductGroup' },
  { domain: '04_master_data', name: 'vendor_account_groups', label: 'Vendor Account Groups', path: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BPCreditWorthiness' },

  // PRICING
  { domain: '05_pricing', name: 'condition_types', label: 'Condition Types', path: '/sap/opu/odata/sap/API_SLSPRCGCONDITIONTYPE_SRV/A_SlsPrcgConditionType' },
  { domain: '05_pricing', name: 'condition_tables', label: 'Condition Tables', path: '/sap/opu/odata/sap/API_SLSPRCGCNDNRECDTYPE_SRV/A_SlsPrcgCndnRecdType' },

  // PURCHASING CONFIG
  { domain: '06_purchasing', name: 'purchase_order_types', label: 'Purchase Order Document Types', path: '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrderType' },
  { domain: '06_purchasing', name: 'incoterms', label: 'Incoterms', path: '/sap/opu/odata/sap/API_INCOTERMS_SRV/A_Incoterms' },
  { domain: '06_purchasing', name: 'payment_terms', label: 'Payment Terms', path: '/sap/opu/odata/sap/API_PAYMENTTERMS_SRV/A_PaymentTerms' }
];

// ──────────────────────────────────────────────
// MOTOR DE EXTRACCIÓN (paginado automático)
// ──────────────────────────────────────────────
async function fetchPaged(apiPath) {
  let all = [];
  let skip = 0;
  const TOP = 500;

  while (true) {
    const url = `${BASE}${apiPath}?$format=json&$top=${TOP}&$skip=${skip}`;
    let res;
    try {
      res = await fetch(url, { headers: HEADERS });
    } catch (e) {
      return { error: `Network error: ${e.message}`, data: all };
    }

    if (!res.ok) {
      return { error: `HTTP ${res.status} ${res.statusText}`, data: all };
    }

    let json;
    try {
      json = await res.json();
    } catch (e) {
      return { error: `Respuesta no-JSON: ${e.message}`, data: all };
    }

    const items = json?.d?.results ?? json?.value ?? [];
    if (items.length === 0) break;

    all = all.concat(items.map(r => {
      const clean = { ...r };
      delete clean.__metadata;
      return clean;
    }));

    if (items.length < TOP) break;
    skip += TOP;
    process.stdout.write('.');
  }

  return { error: null, data: all };
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  const outDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const summary = {
    extractedAt: new Date().toISOString(),
    tenant: BASE,
    user: USER,
    client: CLIENT,
    domains: {}
  };

  let mdReport = `# Configuración SAP Public Cloud — ${BASE}\n`;
  mdReport += `**Extraído:** ${summary.extractedAt}  \n`;
  mdReport += `**Usuario:** ${summary.user}  \n`;
  mdReport += `**Cliente:** ${summary.client}\n\n---\n\n`;

  const byDomain = {};
  for (const api of APIS) {
    if (!byDomain[api.domain]) byDomain[api.domain] = [];
    byDomain[api.domain].push(api);
  }

  for (const [domain, apis] of Object.entries(byDomain)) {
    const domainLabel = domain.replace(/^\d+_/, '').replace(/_/g, ' ').toUpperCase();
    console.log(`\n📂 ${domainLabel}`);
    mdReport += `## ${domainLabel}\n\n`;

    for (const api of apis) {
      process.stdout.write(`   📥 ${api.label}... `);
      const result = await fetchPaged(api.path);

      const entry = {
        label: api.label,
        path: api.path,
        count: result.data.length,
        error: result.error,
        records: result.data
      };

      if (!summary.domains[domain]) summary.domains[domain] = {};
      summary.domains[domain][api.name] = entry;

      if (result.error) {
        console.log(`❌ ${result.error}`);
        mdReport += `### ${api.label}\n⚠️ No disponible: \`${result.error}\`\n\n`;
      } else {
        console.log(`✅ ${result.data.length} registros`);

        fs.writeFileSync(
          path.join(outDir, `${domain}__${api.name}.json`),
          JSON.stringify(result.data, null, 2)
        );

        mdReport += `### ${api.label}\n`;
        mdReport += `**Registros totales:** ${result.data.length}  \n`;
        mdReport += `**Archivo:** \`output/${domain}__${api.name}.json\`\n\n`;

        if (result.data.length > 0) {
          const fields = Object.keys(result.data[0]).slice(0, 8);
          mdReport += `| ${fields.join(' | ')} |\n`;
          mdReport += `| ${fields.map(() => '---').join(' | ')} |\n`;
          result.data.slice(0, 100).forEach(r => {
            const vals = fields.map(f => String(r[f] ?? '').substring(0, 40));
            mdReport += `| ${vals.join(' | ')} |\n`;
          });
          if (result.data.length > 100) {
            mdReport += `\n*... ${result.data.length - 100} registros más en el JSON*\n`;
          }
        }
        mdReport += '\n';
      }
    }
  }

  fs.writeFileSync(path.join(outDir, '00_FULL_EXTRACT.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, '00_CONFIG_REPORT.md'), mdReport);

  console.log('\n\n══════════════════════════════════════');
  console.log('✅ EXTRACCIÓN COMPLETA');
  console.log('══════════════════════════════════════');
  let total = 0, ok = 0, fail = 0;
  for (const domain of Object.values(summary.domains)) {
    for (const api of Object.values(domain)) {
      total++;
      if (api.error) fail++; else ok++;
    }
  }
  console.log(`   APIs exitosas:  ${ok}/${total}`);
  console.log(`   APIs fallidas:  ${fail}/${total}`);
  console.log('\nArchivos generados en ./output/:');
  console.log('   📄 00_FULL_EXTRACT.json  → todo en un JSON');
  console.log('   📄 00_CONFIG_REPORT.md   → reporte legible');
  console.log('   📄 <domain>__<name>.json → un archivo por entidad');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
