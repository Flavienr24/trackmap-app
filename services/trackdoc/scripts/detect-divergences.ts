/**
 * Pre-Migration Script: Detect Event Divergences
 *
 * Detects events with the same name but potentially different meanings
 * (based on property variations) to require manual review before migration.
 *
 * Usage: npx tsx services/trackdoc/scripts/detect-divergences.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface Divergence {
  product_name: string;
  event_name: string;
  unique_property_sets: number;
  pages: string;
  first_occurrence: string;
  last_update: string;
}

async function detectDivergences() {
  console.log('🔍 Détection des divergences potentielles d\'events...\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Fetch all events with their pages and products using Prisma
    // Approach: Pull data via Prisma, consolidate in TypeScript
    // Benefits: Compatible SQLite/PostgreSQL, maintainable, readable
    // Note: Explicit select to avoid fetching eventDefinitionId (not yet in DB)
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        properties: true,
        createdAt: true,
        updatedAt: true,
        page: {
          select: {
            id: true,
            name: true,
            productId: true,
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

    // Group events by (productId, eventName)
    const eventGroups = new Map<string, {
      productName: string;
      eventName: string;
      propertySets: Set<string>;
      pages: string[];
      firstOccurrence: Date;
      lastUpdate: Date;
    }>();

    for (const event of events) {
      const key = `${event.page.productId}::${event.name}`;

      if (!eventGroups.has(key)) {
        eventGroups.set(key, {
          productName: event.page.product.name,
          eventName: event.name,
          propertySets: new Set(),
          pages: [],
          firstOccurrence: event.createdAt,
          lastUpdate: event.updatedAt
        });
      }

      const group = eventGroups.get(key)!;

      // Track unique property structures
      group.propertySets.add(event.properties);

      // Track pages
      if (!group.pages.includes(event.page.name)) {
        group.pages.push(event.page.name);
      }

      // Track date ranges
      if (event.createdAt < group.firstOccurrence) {
        group.firstOccurrence = event.createdAt;
      }
      if (event.updatedAt > group.lastUpdate) {
        group.lastUpdate = event.updatedAt;
      }
    }

    // Filter groups with divergences (> 1 unique property set)
    const divergences = Array.from(eventGroups.values())
      .filter(group => group.propertySets.size > 1)
      .map(group => ({
        product_name: group.productName,
        event_name: group.eventName,
        unique_property_sets: group.propertySets.size,
        pages: group.pages.join(','),
        first_occurrence: group.firstOccurrence.getTime().toString(),
        last_update: group.lastUpdate.getTime().toString()
      }))
      .sort((a, b) => {
        // Sort by unique_property_sets DESC, then product_name, then event_name
        if (b.unique_property_sets !== a.unique_property_sets) {
          return b.unique_property_sets - a.unique_property_sets;
        }
        if (a.product_name !== b.product_name) {
          return a.product_name.localeCompare(b.product_name);
        }
        return a.event_name.localeCompare(b.event_name);
      });

    if (divergences.length === 0) {
      console.log('✅ Aucune divergence détectée.');
      console.log('\nTous les events ont des propriétés cohérentes.\n');
      console.log('Migration peut procéder en toute sécurité. 🚀\n');
      return [];
    }

    console.log(`⚠️  ${divergences.length} event(s) avec propriétés divergentes détectées :\n`);

    // Display table
    console.table(divergences.map(d => ({
      'Produit': d.product_name,
      'Event': d.event_name,
      'Variantes': Number(d.unique_property_sets),
      'Première utilisation': d.first_occurrence ? String(d.first_occurrence).split('T')[0] : 'N/A'
    })));

    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const logsDir = path.join(__dirname, '../logs');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Normalize data for JSON serialization (handle BigInt)
    const normalizedData = divergences.map(d => ({
      product_name: String(d.product_name),
      event_name: String(d.event_name),
      unique_property_sets: Number(d.unique_property_sets),
      pages: String(d.pages),
      first_occurrence: String(d.first_occurrence),
      last_update: String(d.last_update)
    }));

    const filename = path.join(logsDir, `migration-divergences-${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(normalizedData, null, 2));

    console.log(`\n📄 Résultats détaillés sauvegardés dans :`);
    console.log(`   ${filename}\n`);

    console.log('⚠️  REVIEW MANUELLE REQUISE avant de continuer la migration.');
    console.log('\nActions recommandées :');
    console.log('1. Examiner le fichier JSON généré');
    console.log('2. Identifier si les divergences sont intentionnelles');
    console.log('3. Décider de la règle de résolution (plus récent, plus complet, etc.)');
    console.log('4. Si OK, continuer la migration\n');
    console.log('💡 La migration utilisera la règle : "version la plus récente (MAX updated_at)"\n');

    return divergences;
  } catch (error) {
    console.error('❌ Erreur lors de la détection des divergences:', error);
    throw error;
  }
}

// Run the detection
detectDivergences()
  .catch((error) => {
    console.error('\n💥 Échec de l\'exécution:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
