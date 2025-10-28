/**
 * Verification Script: Migration Pass 2 - Event Definitions Back-fill
 *
 * Validates the successful execution of backfill-event-definitions.ts:
 * - All events have non-null event_definition_id
 * - No duplicate (product_id, name) in event_definitions
 * - No orphan EventDefinitions
 * - Shadow column name consistency with EventDefinition
 * - Event/property counts preserved
 * - EventDefinitionHistory entries exist
 *
 * Run after backfill-event-definitions.ts to ensure Pass 2 is complete.
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
 * Verify all events have event_definition_id (no orphans)
 */
async function verifyAllEventsLinked() {
  console.log('\n🔗 Vérification des liens Event → EventDefinition...\n');

  try {
    const totalEvents = await prisma.event.count();
    const linkedEvents = await prisma.event.count({
      where: { eventDefinitionId: { not: null } }
    });
    const orphanEvents = await prisma.event.count({
      where: { eventDefinitionId: null }
    });

    if (orphanEvents === 0) {
      addResult(
        'Events Linkage',
        'PASS',
        `Tous les ${totalEvents} events ont un event_definition_id`,
        { totalEvents, linkedEvents, orphanEvents }
      );
    } else {
      addResult(
        'Events Linkage',
        'FAIL',
        `${orphanEvents} events orphelins (sans event_definition_id)`,
        { totalEvents, linkedEvents, orphanEvents }
      );
    }

  } catch (error: any) {
    addResult('Events Linkage', 'FAIL', 'Erreur lors de la vérification des liens', error.message);
    throw error;
  }
}

/**
 * Verify no duplicate (product_id, name) in event_definitions
 */
async function verifyNoDuplicateDefinitions() {
  console.log('\n🔍 Vérification unicité EventDefinitions...\n');

  try {
    const definitions = await prisma.eventDefinition.findMany({
      select: {
        id: true,
        productId: true,
        name: true,
        product: {
          select: { name: true }
        }
      }
    });

    // Check for duplicates
    const seen = new Map<string, { id: string; productName: string; eventName: string }>();
    const duplicates: Array<{
      key: string;
      occurrences: Array<{ id: string; productName: string; eventName: string }>;
    }> = [];

    for (const def of definitions) {
      const key = `${def.productId}::${def.name}`;

      if (seen.has(key)) {
        // Found duplicate
        const existing = seen.get(key)!;
        const dupIndex = duplicates.findIndex(d => d.key === key);

        if (dupIndex === -1) {
          duplicates.push({
            key,
            occurrences: [
              existing,
              { id: def.id, productName: def.product.name, eventName: def.name }
            ]
          });
        } else {
          duplicates[dupIndex].occurrences.push({
            id: def.id,
            productName: def.product.name,
            eventName: def.name
          });
        }
      } else {
        seen.set(key, {
          id: def.id,
          productName: def.product.name,
          eventName: def.name
        });
      }
    }

    if (duplicates.length === 0) {
      addResult(
        'Uniqueness',
        'PASS',
        `Aucun doublon détecté (${definitions.length} EventDefinitions)`,
        { totalDefinitions: definitions.length }
      );
    } else {
      addResult(
        'Uniqueness',
        'FAIL',
        `${duplicates.length} doublons détectés`,
        { duplicates }
      );
    }

  } catch (error: any) {
    addResult('Uniqueness', 'FAIL', 'Erreur lors de la vérification unicité', error.message);
    throw error;
  }
}

/**
 * Verify no orphan EventDefinitions (all have at least one event)
 */
async function verifyNoOrphanDefinitions() {
  console.log('\n🏚️  Vérification EventDefinitions orphelines...\n');

  try {
    const definitions = await prisma.eventDefinition.findMany({
      select: {
        id: true,
        name: true,
        product: {
          select: { name: true }
        },
        _count: {
          select: { events: true }
        }
      }
    });

    const orphans = definitions.filter(def => def._count.events === 0);

    if (orphans.length === 0) {
      addResult(
        'Orphan Definitions',
        'PASS',
        'Aucune EventDefinition orpheline',
        { totalDefinitions: definitions.length }
      );
    } else {
      addResult(
        'Orphan Definitions',
        'FAIL',
        `${orphans.length} EventDefinitions sans events`,
        {
          orphans: orphans.map(o => ({
            id: o.id,
            name: o.name,
            product: o.product.name
          }))
        }
      );
    }

  } catch (error: any) {
    addResult('Orphan Definitions', 'FAIL', 'Erreur lors de la vérification orphelins', error.message);
    throw error;
  }
}

/**
 * Verify shadow column consistency (Event.name === EventDefinition.name)
 */
async function verifyShadowColumnConsistency() {
  console.log('\n📝 Vérification cohérence colonne shadow "name"...\n');

  try {
    // Fetch events with their definitions
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        eventDefinition: {
          select: {
            id: true,
            name: true
          }
        }
      },
      where: {
        eventDefinitionId: { not: null }
      }
    });

    const inconsistencies = events.filter(
      event => event.eventDefinition && event.name !== event.eventDefinition.name
    );

    if (inconsistencies.length === 0) {
      addResult(
        'Shadow Column',
        'PASS',
        'Cohérence Event.name ↔ EventDefinition.name vérifiée',
        { checkedEvents: events.length }
      );
    } else {
      addResult(
        'Shadow Column',
        'FAIL',
        `${inconsistencies.length} incohérences détectées`,
        {
          inconsistencies: inconsistencies.map(e => ({
            eventId: e.id,
            eventName: e.name,
            definitionName: e.eventDefinition?.name
          }))
        }
      );
    }

  } catch (error: any) {
    addResult('Shadow Column', 'FAIL', 'Erreur lors de la vérification shadow column', error.message);
    throw error;
  }
}

/**
 * Verify event/property counts preserved from Pass 1
 */
async function verifyDataPreservation() {
  console.log('\n📊 Vérification préservation des données...\n');

  try {
    const eventCount = await prisma.event.count();
    const propertyCount = await prisma.property.count();
    const productCount = await prisma.product.count();
    const pageCount = await prisma.page.count();

    // Expected counts from Pass 1 (from log-migration-pass1.ts)
    const expectedCounts = {
      events: 14,
      properties: 15,
      products: 1,
      pages: 3 // Note: was 2 in some logs, verify actual
    };

    const preserved =
      eventCount === expectedCounts.events &&
      propertyCount === expectedCounts.properties &&
      productCount === expectedCounts.products;

    if (preserved) {
      addResult(
        'Data Preservation',
        'PASS',
        'Toutes les données Pass 1 préservées',
        {
          events: { expected: expectedCounts.events, actual: eventCount },
          properties: { expected: expectedCounts.properties, actual: propertyCount },
          products: { expected: expectedCounts.products, actual: productCount },
          pages: { expected: expectedCounts.pages, actual: pageCount }
        }
      );
    } else {
      addResult(
        'Data Preservation',
        'FAIL',
        'Perte de données détectée',
        {
          events: { expected: expectedCounts.events, actual: eventCount },
          properties: { expected: expectedCounts.properties, actual: propertyCount },
          products: { expected: expectedCounts.products, actual: productCount },
          pages: { expected: expectedCounts.pages, actual: pageCount }
        }
      );
    }

  } catch (error: any) {
    addResult('Data Preservation', 'FAIL', 'Erreur lors de la vérification préservation', error.message);
    throw error;
  }
}

/**
 * Verify EventDefinitionHistory entries exist
 */
async function verifyHistoryEntries() {
  console.log('\n📚 Vérification EventDefinitionHistory...\n');

  try {
    const definitions = await prisma.eventDefinition.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { history: true }
        }
      }
    });

    const withoutHistory = definitions.filter(def => def._count.history === 0);

    if (withoutHistory.length === 0) {
      addResult(
        'History Entries',
        'PASS',
        `Toutes les EventDefinitions ont au moins une entrée d'historique`,
        {
          totalDefinitions: definitions.length,
          totalHistoryEntries: definitions.reduce((sum, def) => sum + def._count.history, 0)
        }
      );
    } else {
      addResult(
        'History Entries',
        'WARN',
        `${withoutHistory.length} EventDefinitions sans historique`,
        {
          withoutHistory: withoutHistory.map(d => ({ id: d.id, name: d.name }))
        }
      );
    }

    // Check for auto-backfill entries
    const backfillEntries = await prisma.eventDefinitionHistory.count({
      where: { field: 'auto-backfill' }
    });

    if (backfillEntries === definitions.length) {
      addResult(
        'Auto-backfill History',
        'PASS',
        'Toutes les EventDefinitions ont une entrée "auto-backfill"',
        { backfillEntries }
      );
    } else {
      addResult(
        'Auto-backfill History',
        'WARN',
        `${definitions.length - backfillEntries} définitions sans entrée auto-backfill`,
        { expected: definitions.length, actual: backfillEntries }
      );
    }

  } catch (error: any) {
    addResult('History Entries', 'FAIL', 'Erreur lors de la vérification historique', error.message);
    throw error;
  }
}

/**
 * Generate verification report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('RAPPORT DE VÉRIFICATION - MIGRATION PASS 2');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️  WARN: ${warnings}`);
  console.log(`📊 Total checks: ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ MIGRATION PASS 2 VERIFICATION FAILED\n');
    console.log('Les erreurs suivantes doivent être corrigées:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
    console.log('\n⚠️  NE PAS CONTINUER avec Pass 3 tant que ces erreurs persistent.\n');
  } else if (warnings > 0) {
    console.log('⚠️  MIGRATION PASS 2 VERIFICATION - WARNINGS\n');
    console.log('Avertissements à vérifier:\n');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
    console.log('\n✅ Pas d\'erreurs critiques, mais review recommandée avant Pass 3.\n');
  } else {
    console.log('✅ MIGRATION PASS 2 VERIFICATION SUCCESSFUL\n');
    console.log('Le back-fill Pass 2 s\'est déroulé correctement.');
    console.log('Prochaines étapes:\n');
    console.log('  1. Remplir manuellement description + userInteractionType');
    console.log('  2. Review des divergences (voir DIVERGENCES_REVIEW.md)');
    console.log('  3. Créer migration Pass 3 (rendre event_definition_id NOT NULL)\n');
  }

  // Save report to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const report = {
    timestamp,
    migration: '20251028142000_event_definitions_pass2',
    summary: {
      passed,
      failed,
      warnings,
      total: results.length
    },
    results
  };

  const filename = path.join(logsDir, `migration-pass2-verification-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));

  console.log(`📄 Rapport détaillé sauvegardé dans :`);
  console.log(`   ${filename}\n`);

  return failed === 0;
}

/**
 * Main verification function
 */
async function verifyMigrationPass2() {
  console.log('🔍 VÉRIFICATION MIGRATION PASS 2 - EVENT DEFINITIONS BACKFILL\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Run all verification checks
    await verifyAllEventsLinked();
    await verifyNoDuplicateDefinitions();
    await verifyNoOrphanDefinitions();
    await verifyShadowColumnConsistency();
    await verifyDataPreservation();
    await verifyHistoryEntries();

    // Generate final report
    const success = generateReport();

    if (!success) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Erreur critique lors de la vérification:', error);
    process.exit(1);
  }
}

verifyMigrationPass2()
  .catch((error) => {
    console.error('\n💥 Échec de la vérification:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
