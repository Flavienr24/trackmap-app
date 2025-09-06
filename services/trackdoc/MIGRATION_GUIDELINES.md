# Migration Guidelines - TrackDoc

## ❌ JAMAIS utiliser en production

- `prisma db push` - Peut supprimer les données
- `prisma db push --force-reset` - DESTRUCTIF
- Modifications directes du schéma sans migration

## ✅ Procédure obligatoire pour les changements de schéma

### 1. Sauvegarde préalable
```bash
# TOUJOURS avant toute migration
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Migration trackée
```bash
# Créer une migration nommée
npx prisma migrate dev --name "description-precise-du-changement"
```

### 3. Test complet
- Vérifier que les données existent après migration
- Tester les endpoints API
- Valider les tests automatisés

### 4. Rollback en cas de problème
```bash
# Restaurer depuis sauvegarde
cp prisma/dev.db.backup.YYYYMMDD_HHMMSS prisma/dev.db
npx prisma generate
```

## Environnements

### Développement
- Migrations trackées obligatoires
- Sauvegarde automatique avant chaque migration
- Tests post-migration

### Production
- SEUL `prisma migrate deploy` autorisé
- Sauvegardes multiples (automatique + manuelle)
- Tests sur copie de prod avant déploiement
- Stratégie de rollback validée

## Checklist de migration

- [ ] Sauvegarde créée
- [ ] Migration nommée et descriptive
- [ ] Données vérifiées après migration
- [ ] Tests API passent
- [ ] Rollback testé
- [ ] Documentation mise à jour