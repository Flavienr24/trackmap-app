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
  console.log('=' . repeat(60) + '\n');

  try {
    // Detect events with same name but different property structures
    // Using raw SQL for complex aggregation
    const divergences = await prisma.$queryRaw<Divergence[]>`
      SELECT
        p.name as product_name,
        e.name as event_name,
        COUNT(DISTINCT e.properties) as unique_property_sets,
        GROUP_CONCAT(pg.name) as pages,
        MIN(e.created_at) as first_occurrence,
        MAX(e.updated_at) as last_update
      FROM events e
      JOIN pages pg ON e.page_id = pg.id
      JOIN products p ON pg.product_id = p.id
      GROUP BY p.id, e.name
      HAVING unique_property_sets > 1
      ORDER BY unique_property_sets DESC, p.name, e.name
    `;

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
