/**
 * Back-fill Script: Migration Pass 2 - Event Definitions
 *
 * Creates EventDefinitions for all unique event names and links existing Events.
 *
 * Strategy (based on dev review):
 * - description: Empty string (to be filled manually by the team)
 * - userInteractionType: "interaction" (default value, to be refined manually)
 * - Consolidate all events with same name into one EventDefinition
 * - Create EventDefinitionHistory entry for auto-backfill audit
 *
 * Run after verify-migration-pass1.ts and log-migration-pass1.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface EventGroup {
  productId: string;
  productName: string;
  eventName: string;
  eventIds: string[];
  occurrences: number;
}

interface BackfillResult {
  eventDefinitionId: string;
  productId: string;
  productName: string;
  eventName: string;
  eventsLinked: number;
  eventIds: string[];
  historyEntryId: string;
}

const results: BackfillResult[] = [];

/**
 * Group events by (productId, name)
 */
async function groupEvents(): Promise<EventGroup[]> {
  console.log('📊 Groupement des events par nom...\n');

  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      page: {
        select: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  const groupMap = new Map<string, EventGroup>();

  for (const event of events) {
    const key = `${event.page.product.id}::${event.name}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        productId: event.page.product.id,
        productName: event.page.product.name,
        eventName: event.name,
        eventIds: [],
        occurrences: 0
      });
    }

    const group = groupMap.get(key)!;
    group.eventIds.push(event.id);
    group.occurrences++;
  }

  const groups = Array.from(groupMap.values());
  console.log(`✅ ${groups.length} groupes d'events détectés\n`);

  return groups;
}

/**
 * Create EventDefinition for a group and link events
 */
async function createEventDefinition(group: EventGroup): Promise<BackfillResult> {
  console.log(`🔨 Création EventDefinition: ${group.eventName} (${group.productName})`);

  try {
    // Create EventDefinition
    const eventDefinition = await prisma.eventDefinition.create({
      data: {
        productId: group.productId,
        name: group.eventName,
        description: '', // Empty - to be filled manually
        userInteractionType: 'interaction' // Default - to be refined manually
      }
    });

    console.log(`   ✅ EventDefinition créée: ${eventDefinition.id}`);

    // Link all events to this definition
    const updateResult = await prisma.event.updateMany({
      where: {
        id: { in: group.eventIds }
      },
      data: {
        eventDefinitionId: eventDefinition.id
      }
    });

    console.log(`   ✅ ${updateResult.count} events liés`);

    // Create history entry for auto-backfill audit
    const historyEntry = await prisma.eventDefinitionHistory.create({
      data: {
        eventDefinitionId: eventDefinition.id,
        field: 'auto-backfill',
        oldValue: null,
        newValue: `Backfilled from ${group.occurrences} existing events`,
        author: 'system'
      }
    });

    console.log(`   ✅ Entrée historique créée: ${historyEntry.id}\n`);

    return {
      eventDefinitionId: eventDefinition.id,
      productId: group.productId,
      productName: group.productName,
      eventName: group.eventName,
      eventsLinked: updateResult.count,
      eventIds: group.eventIds,
      historyEntryId: historyEntry.id
    };

  } catch (error: any) {
    console.error(`   ❌ Erreur lors de la création: ${error.message}\n`);
    throw error;
  }
}

/**
 * Verify back-fill results
 */
async function verifyBackfill(): Promise<{
  totalDefinitions: number;
  totalEventsLinked: number;
  orphanEvents: number;
}> {
  console.log('\n🔍 Vérification du back-fill...\n');

  const totalDefinitions = await prisma.eventDefinition.count();
  const totalEventsLinked = await prisma.event.count({
    where: { eventDefinitionId: { not: null } }
  });
  const orphanEvents = await prisma.event.count({
    where: { eventDefinitionId: null }
  });

  console.log(`   EventDefinitions créées: ${totalDefinitions}`);
  console.log(`   Events liés: ${totalEventsLinked}`);
  console.log(`   Events orphelins: ${orphanEvents}\n`);

  return { totalDefinitions, totalEventsLinked, orphanEvents };
}

/**
 * Generate back-fill report
 */
function generateReport(verification: {
  totalDefinitions: number;
  totalEventsLinked: number;
  orphanEvents: number;
}) {
  console.log('\n' + '='.repeat(60));
  console.log('RAPPORT DE BACK-FILL - MIGRATION PASS 2');
  console.log('='.repeat(60) + '\n');

  console.log(`📊 Résultats:\n`);
  console.log(`   EventDefinitions créées:     ${verification.totalDefinitions}`);
  console.log(`   Events liés au total:        ${verification.totalEventsLinked}`);
  console.log(`   Events orphelins:            ${verification.orphanEvents}\n`);

  if (verification.orphanEvents > 0) {
    console.log('❌ BACK-FILL INCOMPLET\n');
    console.log(`   ${verification.orphanEvents} events n'ont pas été liés à une EventDefinition.\n`);
    console.log('   Vérifiez les logs pour identifier le problème.\n');
    return false;
  }

  console.log('✅ BACK-FILL RÉUSSI\n');

  console.log('📝 Détails par EventDefinition:\n');
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.eventName} (${result.productName})`);
    console.log(`      ID: ${result.eventDefinitionId}`);
    console.log(`      Events liés: ${result.eventsLinked}`);
    console.log(`      Historique: ${result.historyEntryId}`);
    console.log('');
  });

  console.log('⚠️  ACTIONS REQUISES POST-BACKFILL:\n');
  console.log('   1. Remplir manuellement les champs vides:');
  console.log('      - description (actuellement vide)');
  console.log('      - userInteractionType (actuellement "interaction" par défaut)\n');
  console.log('   2. Review des divergences (voir DIVERGENCES_REVIEW.md):');
  console.log('      - Vérifier homogénéité article_author (add_favorite / remove_favorite)');
  console.log('      - Investiguer page_view Homepage vide\n');
  console.log('   3. Exécuter verify-migration-pass2.ts pour validation\n');

  return true;
}

/**
 * Save back-fill report to file
 */
function saveReport(verification: {
  totalDefinitions: number;
  totalEventsLinked: number;
  orphanEvents: number;
}) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logsDir = path.join(__dirname, '../logs');

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const report = {
    timestamp,
    migration: '20251028142000_event_definitions_pass2_backfill',
    summary: verification,
    results
  };

  const filename = path.join(logsDir, `migration-pass2-backfill-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));

  console.log(`📄 Rapport détaillé sauvegardé dans :`);
  console.log(`   ${filename}\n`);
}

/**
 * Main back-fill function
 */
async function backfillEventDefinitions() {
  console.log('🔨 BACK-FILL MIGRATION PASS 2 - EVENT DEFINITIONS\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Group events by name
    const groups = await groupEvents();

    // Create EventDefinition for each group
    console.log('📝 Création des EventDefinitions...\n');

    for (const group of groups) {
      const result = await createEventDefinition(group);
      results.push(result);
    }

    // Verify results
    const verification = await verifyBackfill();

    // Generate report
    const success = generateReport(verification);

    // Save to file
    saveReport(verification);

    if (!success) {
      process.exit(1);
    }

    console.log('✅ BACK-FILL TERMINÉ\n');

  } catch (error) {
    console.error('\n💥 Erreur critique lors du back-fill:', error);
    process.exit(1);
  }
}

backfillEventDefinitions()
  .catch((error) => {
    console.error('\n💥 Échec du back-fill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
