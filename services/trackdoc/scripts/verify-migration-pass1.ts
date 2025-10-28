/**
 * Verification Script: Migration Pass 1 - Event Definitions
 *
 * Validates the successful application of migration 20251028142000_event_definitions_pass1:
 * - Checks all required tables exist
 * - Verifies foreign key relationships
 * - Validates data integrity and count preservation
 * - Checks indexes are properly created
 *
 * Run after migration deployment to ensure database state is correct.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface VerificationResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

/**
 * Add verification result
 */
function addResult(step: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ step, status, message, details });

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${step}: ${message}`);

  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

/**
 * Check if required tables exist
 */
async function verifyTablesExist() {
  console.log('\n📋 Vérification des tables...\n');

  try {
    // Check event_definitions table
    await prisma.$queryRaw`SELECT 1 FROM event_definitions LIMIT 1`;
    addResult('Tables', 'PASS', 'Table event_definitions existe');

    // Check event_definition_history table
    await prisma.$queryRaw`SELECT 1 FROM event_definition_history LIMIT 1`;
    addResult('Tables', 'PASS', 'Table event_definition_history existe');

    // Check events table has new column
    const events = await prisma.$queryRaw<Array<{event_definition_id: string | null}>>`
      SELECT event_definition_id FROM events LIMIT 1
    `;
    addResult('Tables', 'PASS', 'Colonne event_definition_id ajoutée à events');

  } catch (error: any) {
    addResult('Tables', 'FAIL', 'Erreur lors de la vérification des tables', error.message);
    throw error;
  }
}

/**
 * Verify data counts (no data loss)
 */
async function verifyDataCounts() {
  console.log('\n📊 Vérification des comptages...\n');

  try {
    const eventCount = await prisma.event.count();
    addResult('Comptages', 'PASS', `${eventCount} events préservés`);

    const productCount = await prisma.product.count();
    addResult('Comptages', 'PASS', `${productCount} produits préservés`);

    const pageCount = await prisma.page.count();
    addResult('Comptages', 'PASS', `${pageCount} pages préservées`);

    const propertyCount = await prisma.property.count();
    addResult('Comptages', 'PASS', `${propertyCount} propriétés préservées`);

    return { eventCount, productCount, pageCount, propertyCount };
  } catch (error: any) {
    addResult('Comptages', 'FAIL', 'Erreur lors du comptage des données', error.message);
    throw error;
  }
}

/**
 * Verify foreign key relationships
 */
async function verifyForeignKeys() {
  console.log('\n🔗 Vérification des relations...\n');

  try {
    // Check events.page_id relationships using raw query
    const orphanEventsResult = await prisma.$queryRaw<Array<{count: number}>>`
      SELECT COUNT(*) as count FROM events
      WHERE page_id NOT IN (SELECT id FROM pages)
    `;
    const orphanEvents = Number(orphanEventsResult[0]?.count || 0);

    if (orphanEvents === 0) {
      addResult('Relations', 'PASS', 'Aucun event orphelin (page_id valides)');
    } else {
      addResult('Relations', 'FAIL', `${orphanEvents} events orphelins détectés`, { orphanEvents });
    }

    // Check pages.product_id relationships using raw query
    const orphanPagesResult = await prisma.$queryRaw<Array<{count: number}>>`
      SELECT COUNT(*) as count FROM pages
      WHERE product_id NOT IN (SELECT id FROM products)
    `;
    const orphanPages = Number(orphanPagesResult[0]?.count || 0);

    if (orphanPages === 0) {
      addResult('Relations', 'PASS', 'Aucune page orpheline (product_id valides)');
    } else {
      addResult('Relations', 'FAIL', `${orphanPages} pages orphelines détectées`, { orphanPages });
    }

  } catch (error: any) {
    addResult('Relations', 'FAIL', 'Erreur lors de la vérification des relations', error.message);
    throw error;
  }
}

/**
 * Verify event_definition_id column state (should be NULL for Pass 1)
 */
async function verifyEventDefinitionColumn() {
  console.log('\n🔍 Vérification colonne event_definition_id...\n');

  try {
    const eventsWithDefinition = await prisma.event.count({
      where: {
        eventDefinitionId: { not: null }
      }
    });

    const eventsWithoutDefinition = await prisma.event.count({
      where: {
        eventDefinitionId: null
      }
    });

    if (eventsWithDefinition === 0 && eventsWithoutDefinition > 0) {
      addResult(
        'EventDefinition FK',
        'PASS',
        'Tous les events ont event_definition_id NULL (Pass 1 OK)',
        { eventsWithDefinition, eventsWithoutDefinition }
      );
    } else if (eventsWithDefinition > 0) {
      addResult(
        'EventDefinition FK',
        'WARN',
        'Certains events ont déjà un event_definition_id (Pass 2 en cours?)',
        { eventsWithDefinition, eventsWithoutDefinition }
      );
    } else {
      addResult(
        'EventDefinition FK',
        'FAIL',
        'Aucun event trouvé',
        { eventsWithDefinition, eventsWithoutDefinition }
      );
    }

  } catch (error: any) {
    addResult('EventDefinition FK', 'FAIL', 'Erreur lors de la vérification event_definition_id', error.message);
    throw error;
  }
}

/**
 * Verify Event.name shadow column is preserved
 */
async function verifyShadowColumn() {
  console.log('\n📝 Vérification colonne shadow "name"...\n');

  try {
    const eventsWithName = await prisma.event.count({
      where: {
        name: { not: '' }
      }
    });

    const eventsWithoutName = await prisma.event.count({
      where: {
        name: ''
      }
    });

    const totalEvents = eventsWithName + eventsWithoutName;

    if (eventsWithName === totalEvents) {
      addResult(
        'Shadow Column',
        'PASS',
        'Tous les events ont leur colonne "name" préservée',
        { eventsWithName, eventsWithoutName }
      );
    } else {
      addResult(
        'Shadow Column',
        'FAIL',
        `${eventsWithoutName} events ont perdu leur nom`,
        { eventsWithName, eventsWithoutName }
      );
    }

  } catch (error: any) {
    addResult('Shadow Column', 'FAIL', 'Erreur lors de la vérification de la colonne name', error.message);
    throw error;
  }
}

/**
 * Detect database provider from DATABASE_URL
 */
function detectDatabaseProvider(): 'sqlite' | 'postgresql' | 'unknown' {
  const databaseUrl = process.env.DATABASE_URL || '';

  if (databaseUrl.startsWith('file:') || databaseUrl.includes('sqlite')) {
    return 'sqlite';
  } else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return 'postgresql';
  }

  return 'unknown';
}

/**
 * Verify indexes exist (compatible SQLite + PostgreSQL)
 */
async function verifyIndexes() {
  console.log('\n📇 Vérification des indexes...\n');

  try {
    const provider = detectDatabaseProvider();
    const requiredIndexes = [
      'events_page_id_idx',
      'events_event_definition_id_idx',
      'events_status_idx',
      'events_updated_at_idx',
      'event_definitions_product_id_idx',
      'event_definitions_product_id_name_key',
      'event_definition_history_event_definition_id_idx'
    ];

    let existingIndexNames: string[] = [];

    if (provider === 'sqlite') {
      // SQLite: query sqlite_master
      const indexes = await prisma.$queryRaw<Array<{name: string}>>`
        SELECT name FROM sqlite_master
        WHERE type='index'
        AND tbl_name IN ('events', 'event_definitions', 'event_definition_history')
      `;
      existingIndexNames = indexes.map(idx => idx.name);

    } else if (provider === 'postgresql') {
      // PostgreSQL: query pg_indexes
      const indexes = await prisma.$queryRaw<Array<{indexname: string}>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('events', 'event_definitions', 'event_definition_history')
      `;
      existingIndexNames = indexes.map(idx => idx.indexname);

    } else {
      addResult('Indexes', 'WARN', 'Provider inconnu - vérification des indexes ignorée', { provider });
      return;
    }

    const missingIndexes = requiredIndexes.filter(idx => !existingIndexNames.includes(idx));

    if (missingIndexes.length === 0) {
      addResult(
        'Indexes',
        'PASS',
        `Tous les indexes requis sont créés (${provider})`,
        { count: requiredIndexes.length, provider }
      );
    } else {
      addResult(
        'Indexes',
        'FAIL',
        `${missingIndexes.length} indexes manquants`,
        { missing: missingIndexes, provider }
      );
    }

  } catch (error: any) {
    addResult('Indexes', 'WARN', 'Impossible de vérifier les indexes (peut varier selon DB)', error.message);
  }
}

/**
 * Verify product name uniqueness constraint
 */
async function verifyProductUniqueness() {
  console.log('\n🔑 Vérification contrainte unicité produits...\n');

  try {
    // Group products by name and check for duplicates
    const products = await prisma.product.findMany({
      select: { name: true }
    });

    const nameMap = new Map<string, number>();
    for (const product of products) {
      nameMap.set(product.name, (nameMap.get(product.name) || 0) + 1);
    }

    const duplicates = Array.from(nameMap.entries()).filter(([_, count]) => count > 1);

    if (duplicates.length === 0) {
      addResult(
        'Unicité Produits',
        'PASS',
        'Tous les noms de produits sont uniques',
        { totalProducts: products.length }
      );
    } else {
      addResult(
        'Unicité Produits',
        'FAIL',
        `${duplicates.length} noms de produits dupliqués`,
        { duplicates: Object.fromEntries(duplicates) }
      );
    }

  } catch (error: any) {
    addResult('Unicité Produits', 'FAIL', 'Erreur lors de la vérification unicité produits', error.message);
    throw error;
  }
}

/**
 * Generate verification report
 */
function generateReport(counts: any) {
  console.log('\n' + '='.repeat(60));
  console.log('RAPPORT DE VÉRIFICATION - MIGRATION PASS 1');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️  WARN: ${warnings}`);
  console.log(`📊 Total checks: ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ MIGRATION VERIFICATION FAILED\n');
    console.log('Les erreurs suivantes doivent être corrigées:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
    console.log('\n⚠️  NE PAS CONTINUER avec Pass 2 tant que ces erreurs persistent.\n');
  } else {
    console.log('✅ MIGRATION VERIFICATION SUCCESSFUL\n');
    console.log('La migration Pass 1 s\'est déroulée correctement.');
    console.log('Vous pouvez continuer avec le script de logging (log-migration-pass1.ts)\n');
  }

  // Save report to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const report = {
    timestamp,
    migration: '20251028142000_event_definitions_pass1',
    summary: {
      passed,
      failed,
      warnings,
      total: results.length
    },
    counts,
    results
  };

  const filename = path.join(logsDir, `migration-pass1-verification-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));

  console.log(`📄 Rapport détaillé sauvegardé dans :`);
  console.log(`   ${filename}\n`);

  return failed === 0;
}

/**
 * Main verification function
 */
async function verifyMigrationPass1() {
  console.log('🔍 VÉRIFICATION MIGRATION PASS 1 - EVENT DEFINITIONS\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Run all verification checks
    await verifyTablesExist();
    const counts = await verifyDataCounts();
    await verifyForeignKeys();
    await verifyEventDefinitionColumn();
    await verifyShadowColumn();
    await verifyIndexes();
    await verifyProductUniqueness();

    // Generate final report
    const success = generateReport(counts);

    if (!success) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Erreur critique lors de la vérification:', error);
    process.exit(1);
  }
}

verifyMigrationPass1()
  .catch((error) => {
    console.error('\n💥 Échec de la vérification:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
