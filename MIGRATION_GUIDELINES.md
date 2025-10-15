# Guide de Migration Base de Données TrackMap

## Philosophie

Les données sont sacrées. Toute migration DOIT être réversible et testée.

## Checklist Pré-Migration

### Développement

- [ ] Créer backup : `npm run db:backup`
- [ ] Vérifier backup : `ls -lh prisma/backups/`
- [ ] Créer migration : `npm run db:migrate "description"`
- [ ] Vérifier intégrité post-migration
- [ ] Tests passent : `npm test`
- [ ] Commit migration : `git add prisma/migrations/`

### Staging

- [ ] Backup automatique via cron/CI
- [ ] `NODE_ENV=staging npm run db:migrate`
- [ ] Tests de non-régression
- [ ] Validation manuelle données critiques

### Production

- [ ] **Backup externe** : S3/Cloud avec chiffrement
- [ ] Fenêtre de maintenance planifiée
- [ ] `NODE_ENV=production npm run db:migrate` (utilise migrate deploy)
- [ ] Plan de rollback documenté
- [ ] Monitoring 24h post-migration

## Procédures de Rollback

### SQLite (Dev/Staging)

```bash
LATEST_BACKUP=$(ls -t prisma/backups/*.backup.* | head -1)
cp "$LATEST_BACKUP" prisma/dev.db
npx prisma migrate resolve --rolled-back <migration-name>
```

### PostgreSQL (Production)

```bash
# Récupérer backup depuis S3
aws s3 cp s3://bucket/backups/latest.sql.gz /tmp/restore.sql.gz
gunzip /tmp/restore.sql.gz
psql $DATABASE_URL < /tmp/restore.sql

# Marquer migration comme rolled back
npx prisma migrate resolve --rolled-back <migration-name>
```

## Commandes Interdites

| Commande | Raison | Alternative |
|----------|--------|-------------|
| `npx prisma db push` | Peut DROP tables | `npm run db:migrate` |
| `npx prisma db push --force-reset` | Supprime TOUT | Migration + seed |
| `npx prisma migrate reset` | Reconstruit from scratch | Rollback manuel |
| `npm run db:seed` en prod | Vide les tables | **INTERDIT** |

## Tests de Migration Obligatoires

Tout changement de schéma doit inclure :

1. Migration Prisma versionnée
2. Tests avant/après dans `src/__tests__/migrations/`
3. Vérification conservation données
4. Test de rollback

## Historique des Incidents

### 2025-10-14 - Race Condition Tests

**Cause** : Tests utilisaient dev.db au lieu de test.db
**Impact** : Perte dev.db
**Prévention** : Double vérification path dans setup.ts

### 2025-09-06 - Migration Destructive

**Cause** : `prisma db push` au lieu de `migrate dev`
**Impact** : Perte données prod
**Prévention** : Blocage db:push + scripts safe-migrate.sh

## Scripts de Sécurité

### safe-migrate.sh

Script principal pour toutes les migrations. Utilise automatiquement :
- `migrate dev` en développement (crée nouvelles migrations)
- `migrate deploy` en staging/production (applique migrations existantes)

**Usage** :
```bash
cd services/trackdoc
npm run db:migrate "description_de_la_migration"
```

### backup-db.sh

Crée un backup vérifié de la base de données avec test d'intégrité automatique.

**Usage** :
```bash
cd services/trackdoc
npm run db:backup
```

**Vérifications automatiques** :
- Intégrité du backup (SQLite: PRAGMA integrity_check, PostgreSQL: gunzip validation)
- Test de restauration sur DB temporaire
- Validation du contenu (comptage tables)

### backup-upload.sh

Upload les backups sur S3 avec chiffrement AES-256 (voir Phase 1).

### db-restore.sh

Restaure une base de données depuis un backup local ou S3 (voir Phase 1).

## Variables d'Environnement

### Obligatoires

```bash
NODE_ENV=development|staging|production
DATABASE_URL="file:./prisma/dev.db"  # SQLite
# ou
DATABASE_URL="postgresql://user:pass@host:5432/db"  # PostgreSQL
```

### Optionnelles (Phase 1+)

```bash
BACKUP_S3_BUCKET=trackmap-db-backups
BACKUP_ENCRYPTION_KEY=<générer-avec-openssl-rand>
```

## Protection Environnement

### seed.ts

✅ **Protections actives** :
- Bloque `NODE_ENV=production`
- Vérifie DATABASE_URL (refuse si contient "prod" ou "production")
- Warning en staging

### migrate-suggested-values.ts

✅ **Protections actives** :
- Bloque `NODE_ENV=production`
- Refuse PostgreSQL distant (sauf localhost)
- Transaction globale avec timeout 2min

### eventsController.ts

✅ **Transactions atomiques** :
- `createEvent` : event + history + auto-create properties
- `updateEvent` : update + history + auto-create properties
- `updateEventStatus` : status update + history
- `duplicateEvent` : duplication complète atomique

## Bonnes Pratiques

### ✅ À FAIRE

- Toujours utiliser `npm run db:migrate` pour les migrations
- Créer un backup avant toute modification de schéma
- Tester les migrations sur une copie de la base
- Versionner les migrations Prisma dans git
- Documenter les migrations complexes
- Tester le rollback avant de déployer

### ❌ À NE JAMAIS FAIRE

- Utiliser `prisma db push` (bloqué dans package.json)
- Modifier manuellement la base de données
- Exécuter `db:seed` en production
- Déployer sans backup
- Modifier directement le schéma Prisma sans migration
- Ignorer les warnings de safe-migrate.sh

## Résolution de Problèmes

### Erreur "Migration failed"

1. Vérifier les logs dans `logs/`
2. Restaurer depuis backup : `npm run db:restore <backup-file>`
3. Identifier la cause de l'échec
4. Corriger le schéma Prisma
5. Créer une nouvelle migration corrective

### Backup corrompu

Le script `backup-db.sh` vérifie automatiquement l'intégrité. Si un backup est corrompu :

1. Il sera rejeté immédiatement
2. La migration sera bloquée
3. Consulter les logs pour identifier la cause
4. Créer un nouveau backup manuel

### Tests échouent après migration

1. Restaurer backup pré-migration
2. Examiner les changements de schéma
3. Mettre à jour les tests pour refléter le nouveau schéma
4. Re-tester la migration

### Production database detected

Si vous voyez cette erreur en dev :

1. Vérifier `DATABASE_URL` dans `.env`
2. S'assurer qu'il ne contient pas "prod" ou "production"
3. Pour PostgreSQL, utiliser "localhost" pour le dev

## Référence Rapide

### Workflow Complet de Migration

```bash
# 1. Backup
cd services/trackdoc
npm run db:backup

# 2. Créer migration
npm run db:migrate "add_new_column"

# 3. Vérifier
npm test

# 4. Commit
git add prisma/migrations/
git commit -m "feat: add new column to events table"

# 5. En cas de problème - Rollback
LATEST_BACKUP=$(ls -t prisma/backups/*.backup.* | head -1)
npm run db:restore "$LATEST_BACKUP"
```

### Commandes Package.json

```json
{
  "scripts": {
    "db:backup": "./scripts/backup-db.sh",
    "db:migrate": "./scripts/safe-migrate.sh",
    "db:restore": "./scripts/db-restore.sh",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

## Contact & Support

**En cas de doute** :
1. Consulter ce document (MIGRATION_GUIDELINES.md)
2. Lire DATABASE_SECURITY_ROADMAP.md pour le contexte complet
3. Examiner PR #9 pour les détails d'implémentation
4. Consulter les commits : 85751ff, c3d123f, 035e4fd

**Principe fondamental** : En cas de doute, ne pas procéder. Demander de l'aide plutôt que de risquer une perte de données.

---

**Dernière mise à jour** : 2025-10-15
**Version** : 1.0
**Auteur** : TrackMap Team
