# CLAUDE.md - TrackMap Web Application

Ce fichier fournit les instructions contextuelles pour Claude Code lors du développement de l'application web TrackMap.

## Contexte du Projet

**TrackMap** est un outil permettant d'auditer, documenter et collaborer sur les plans de tracking GA4 personnalisés. Il remplace les fichiers Excel manuels par une interface web modulaire pour une meilleure collaboration entre équipes produit, data, QA et développeurs.

### Objectif V1 - Web App
Interface web type "Airtable du tracking" pour documenter et maintenir les plans de tracking, avec focus sur la collaboration future. Cette première version fonctionne de manière standalone (pas encore d'intégration avec TrackmAPI).

### Utilisateurs Cibles V1
- Product Managers
- Designers  
- Data Analysts
- Développeurs front/taggueurs

## Architecture du Projet

### Structure des Données
```
Produit (has_instances: boolean, current_environment si pas d'instances)
  └── Variables Library (partagée au niveau produit)
  └── Instances (optionnel, avec current_environment)
      └── Pages (nom + URLs par environnement)
          └── Events (avec variables, statuts, historique)
```

### Hiérarchie des Entités
1. **Produit** : Application/site à tracker (ex: "E-commerce Mobile")
2. **Instance** : Déclinaisons optionnelles (ex: FR, UK, DE pour multi-pays)
3. **Page** : Pages du site avec URLs par environnement
4. **Event** : Événements GA4 avec variables et cycle de vie

## Stack Technique

- **Frontend** : React avec hooks (useState, useReducer)
- **Backend** : Node.js/Express (API REST)
- **Base de données** : PostgreSQL + Prisma + JSONB
- **ORM** : Prisma pour TypeScript avec migrations
- **Stockage temporaire** : localStorage en attendant le backend

## Modèles de Données

### Product
```json
{
  "id": "uuid",
  "name": "E-commerce Mobile",
  "description": "App mobile e-commerce",
  "has_instances": true,
  "current_environment": "dev" // uniquement si has_instances=false
}
```

### Instance (optionnelle)
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "name": "France", 
  "code": "FR",
  "current_environment": "dev" // uniquement si has_instances=true
}
```

### Page
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "instance_id": "uuid", // null si has_instances=false
  "name": "Homepage",
  "urls": {
    "dev": "https://dev.site.fr/",
    "staging": "https://staging.site.fr/",
    "prod": "https://site.fr/"
  }
}
```

### Event
```json
{
  "id": "uuid",
  "page_id": "uuid",
  "name": "purchase",
  "status": "to_implement|to_test|error|validated",
  "test_date": "2025-07-31",
  "variables": {
    "transaction_id": "string",
    "value": "number"
  }
}
```

### Variables Library

#### Variables (clés)
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "name": "page_name",
  "type": "string|number|boolean|array|object",
  "description": "Nom de la page visitée"
}
```

#### Suggested Values (valeurs partagées)
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "value": "homepage",
  "is_contextual": false
},
{
  "id": "uuid",
  "product_id": "uuid",
  "value": "$page-name",
  "is_contextual": true
}
```

#### Association Variable-Value (optionnelle)
```json
{
  "variable_id": "uuid",
  "suggested_value_id": "uuid"
}
```

## API Endpoints Spécifiés

### Products
- `GET /api/products` - Liste tous les produits
- `POST /api/products` - Crée un produit
- `GET /api/products/:id` - Détail d'un produit
- `PUT /api/products/:id` - Modifie un produit
- `DELETE /api/products/:id` - Supprime un produit

### Instances
- `GET /api/products/:id/instances` - Instances d'un produit
- `POST /api/products/:id/instances` - Crée une instance
- `GET /api/instances/:id` - Détail d'une instance
- `PUT /api/instances/:id` - Modifie une instance
- `DELETE /api/instances/:id` - Supprime une instance

### Pages
- `GET /api/products/:id/pages` - Pages d'un produit
- `GET /api/products/:id/pages?instance=FR&has_events=true` - Pages avec filtres
- `GET /api/instances/:id/pages` - Pages d'une instance
- `POST /api/products/:id/pages` - Crée une page
- `GET /api/pages/:id` - Détail d'une page
- `PUT /api/pages/:id` - Modifie une page
- `DELETE /api/pages/:id` - Supprime une page

### Events
- `GET /api/pages/:id/events` - Events d'une page
- `GET /api/pages/:id/events?status=error,to_test&modified_since=2025-07-01` - Events avec filtres
- `POST /api/pages/:id/events` - Crée un event
- `GET /api/events/:id` - Détail d'un event
- `PUT /api/events/:id` - Modifie un event
- `DELETE /api/events/:id` - Supprime un event
- `PUT /api/events/:id/status` - Change le statut d'un event

### Variables Library
- `GET /api/products/:id/variables` - Variables d'un produit
- `POST /api/products/:id/variables` - Crée une variable
- `GET /api/variables/:id` - Détail d'une variable
- `PUT /api/variables/:id` - Modifie une variable
- `DELETE /api/variables/:id` - Supprime une variable

### Suggested Values
- `GET /api/products/:id/suggested-values` - Valeurs suggérées d'un produit
- `POST /api/products/:id/suggested-values` - Crée une valeur suggérée
- `GET /api/suggested-values/:id` - Détail d'une valeur suggérée
- `PUT /api/suggested-values/:id` - Modifie une valeur suggérée
- `DELETE /api/suggested-values/:id` - Supprime une valeur suggérée
- `GET /api/variables/:id/suggested-values` - Valeurs suggérées pour une variable
- `POST /api/variables/:id/suggested-values` - Associe une valeur à une variable

### Comments & History
- `GET /api/events/:id/comments` - Commentaires d'un event
- `POST /api/events/:id/comments` - Ajoute un commentaire
- `GET /api/events/:id/history` - Historique d'un event

### Search & Analytics
- `GET /api/products/:id/search?q=purchase&status=validated&instance=UK` - Recherche avec filtres
- `GET /api/products/:id/all-pages` - Toutes les pages d'un produit
- `GET /api/products/:id/all-events?status=error&instance=FR&page_name=checkout` - Tous events avec filtres
- `GET /api/products/:id/export?format=csv&status=validated` - Export avec filtres
- `GET /api/products/:id/stats` - Health score, répartition statuts
- `GET /api/products/:id/stats?instance=FR&timeframe=30d` - Stats avec filtres

## Règles de Développement

Le projet doit pousser sur github dans le repo flavienr24/trackmap-app

### MUST (Obligatoire)
- **Demander confirmation avant de coder** : Toujours valider l'approche avant implémentation
- **Créer une branche sur github avant toutes nouvelles features** : Ne jamais écrire du code directement sur la branche principale, toujours suivre les bests practice et coder sur une nouvelle branche (ou branche existante)
- **Minimiser les lignes de code** : Privilégier la modification du code existant vs réécriture complète
- **Code modulaire et factorisé** : Éviter la dette technique, fichiers avec peu de lignes
- **Supprimer le code obsolète** : Éliminer définitivement les fichiers/lignes non utilisés
- **Validation d'architecture** : Ne pas ajouter fichiers/dossiers sans validation
- **Coder directement dans le repo** : Pas d'artefacts, modifications directes des fichiers
- **Tests obligatoires** : Demander si des tests sont nécessaires avant implémentation
- **Push master** : Pousser le code sur la branche principale une fois que tous les tests auront été fait et que je t'aurais donné l'autorisation

### SHOULD (Fortement Recommandé)
- **Interface simple d'abord** : Backend-first avec interfaces CRUD basiques, puis polish UX
- **Transitions d'états libres** : Permettre passage libre entre to_implement, to_test, error, validated
- **Historique séparé des commentaires** : Tracer modifications champs + changements état à part
- **Vue tableau principale** : Commencer par vue tableau avec filtres/recherche

### Workflow de Développement
1. **Phase 1** : API + modèles de données + interfaces CRUD basiques
2. **Phase 2** : Logique métier (états, historique, commentaires)
3. **Phase 3** : Interfaces finales + UX

### Environnements
- **Environnements par défaut** : dev, staging, prod
- **Gestion niveau approprié** : 
  - Si has_instances=false → current_environment sur Product
  - Si has_instances=true → current_environment sur Instance
- **URLs par environnement** : Pages ont URLs distinctes par env

## Fonctionnalités UX Spécifiées

### Interface Principale
- **Vue tableau** avec lignes expandables pour voir variables
- **Filtres et recherche** sur tous champs
- **Navigation vers vue détail** event

### Vue Détail Event
- **Tableau clé/valeur** : mode vue ↔ mode édition
- **Onglets séparés** : Détails | Commentaires | Historique
- **Historique** = modifications champs + changements état (PAS les commentaires)

### États Events
- `to_implement` → `to_test` → `validated`
- `error` (accessible depuis tout état)
- **Transitions libres** entre tous états
- **Date de test** saisissable

## Système de Variables Avancé

### Logique des Valeurs Contextuelles
Les variables peuvent avoir des **valeurs statiques** ou **contextuelles** :

```json
// Valeurs statiques
{
  "event": "page_view",
  "variables": {
    "page_name": "homepage",
    "page_category": "landing"
  }
}

// Valeurs contextuelles (résolues dynamiquement)
{
  "event": "page_view", 
  "variables": {
    "page_name": "$page-name",
    "user_id": "$user-id"
  }
}
```

### Syntaxe des Valeurs Contextuelles
- **Format** : `$variable-name` (dollar + nom-de-variable)
- **Exemples** : `$page-name`, `$user-id`, `$product-category`
- **Résolution** : Ces valeurs seront résolues lors des audits TrackmAPI

### UX de Saisie des Variables

#### Création d'un Event
1. **Champ clé** : 
   - Dropdown/autocomplete des variables existantes
   - Saisie libre autorisée pour nouvelles variables

2. **Champ valeur** (priorité d'affichage) :
   - **1er** : Valeurs contextuelles pertinentes (ex: si clé="page_name" → suggerer `$page-name`)
   - **2e** : Valeurs déjà utilisées pour cette clé spécifique
   - **3e** : Toutes les valeurs suggérées du produit
   - **4e** : Saisie libre (toujours possible)

#### Smart Suggestions
- **Autocomplete intelligent** : suggestions basées sur historique et contexte
- **Réutilisation** : valeurs déjà saisies prioritaires
- **Cohérence** : évite les doublons et erreurs de frappe
- **Flexibilité** : aucune contrainte stricte, saisie libre toujours autorisée

### Avantages du Système
- **Standardisation** : réduction des erreurs de saisie
- **Réutilisabilité** : valeurs partagées entre variables et produits
- **Flexibilité** : pas de contraintes strictes
- **Cohérence** : suggestions intelligentes basées sur l'usage

## Intégrations Futures

### TrackmAPI (API d'audit existante)
- **Rôle** : Moteur d'audit technique, détection events GA4
- **Complémentarité** : Interface Web ↔ Backend Web App ↔ TrackmAPI
- **Architecture modulaire** : 2 backends complémentaires

### Cas d'Usage Futurs
- Synchronisation intelligente (audit détecte → proposition ajout plan)
- Comparaison audit vs documentation
- Audit ciblé sur events "to_test"
- Health score réel basé audits

## Instructions Spéciales

### Tests
- **Demander avant implémentation** : "Veux-tu que des tests soient réalisés ?"
- **Si oui** : Identifier liste tests pour chaque nouvelle fonctionnalité
- **Après développement** : Réaliser tests et corrections nécessaires
- **Validation** : Code validé uniquement si tests passent avec succès
- **Nettoyage** : Supprimer complètement fichiers/éléments créés pour tests

### Logging et Debugging
- **Logs obligatoires** : Implémenter des logs Winston au fur et à mesure de la construction de l'app
- **Couverture complète** : Logger toutes les opérations critiques (CRUD, erreurs, authentification, etc.)
- **Tests et debugging** : Durant les phases de test, toujours consulter les logs stockés (`logs/`) pour identifier les problèmes
- **Niveaux appropriés** : 
  - `error` : Erreurs critiques nécessitant intervention
  - `warn` : Situations anormales mais non bloquantes
  - `info` : Opérations importantes (création utilisateur, actions CRUD)
  - `debug` : Détails pour le développement
- **Contexte riche** : Inclure userId, requestId, IP, durée des requêtes dans les logs

### Gestion Fichiers
- **Pas de fichiers .bak** : Suppression complète, pas de sauvegarde
- **Repository propre** : Maintenir architecture contrôlée

## Références Architecture

Ce projet fait partie de l'écosystème TrackMap avec :
- **TrackmAPI** : Backend audit (Users/flavien/Code/trackmapi)
- **Web App** : Interface documentation (ce projet)
- **Extension Chrome** : Interface audit embarquée (futur)

## Commandes de Raccourci

### Développement
- Toujours demander avant de commencer à coder
- Privilégier modifications vs réécriture
- Confirmer architecture avant ajouts
- Proposer tests pour nouvelles fonctionnalités

Garde ces principes à l'esprit pour maintenir la cohérence et la qualité du code dans le développement de TrackMap Web App.