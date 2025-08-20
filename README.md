# TrackMap Application

TrackMap est un outil permettant d'auditer, documenter et collaborer sur les plans de tracking GA4 personnalisés. Il remplace les fichiers Excel manuels par une solution collaborative moderne utilisant une architecture microservices optimisée.

## Architecture BFF (Backend For Frontend)

L'application utilise une architecture microservices avec un pattern BFF pour optimiser les performances et la maintenabilité :

```
┌─────────────────┐
│   Frontend      │  Client React (Port 3000)
│   (TrackMap)    │  
└─────────┬───────┘
          │
┌─────────▼───────┐
│      BFF        │  🆕 Backend For Frontend (Port 3001)
│                 │  • Endpoints UX-optimisés
│                 │  • Agrégation de données  
│ /api/bff/...    │  • Business logic
└─────────┬───────┘
          │
┌─────────▼───────┐
│   TrackDoc      │  📝 API Documentation (Port 3002)
│                 │  • Pure CRUD operations
│                 │  • Data persistence
│ /api/doc/...    │  • Basic validation
└─────────────────┘
```

## Services

### 🎯 BFF (Backend For Frontend)
**Port 3001** - Optimisé pour les besoins du frontend
- `/api/bff/dashboard` - Données agrégées pour tableau de bord
- `/api/bff/dashboard/products/:id/overview` - Vue complète produit
- `/api/bff/dashboard/stats/summary` - Statistiques résumées
- `/health` - Health check avec dépendances

### 📝 TrackDoc API  
**Port 3002** - API de documentation pure
- `/api/doc/products` - CRUD Products
- `/api/doc/pages` - CRUD Pages  
- `/api/doc/events` - CRUD Events
- `/api/doc/variables` - CRUD Variables Library
- `/api/doc/suggested-values` - CRUD Suggested Values

## Installation & Développement

### Prérequis
- Node.js 18+
- PostgreSQL
- npm

### Installation Complète
```bash
# Installation des dépendances (workspace)
npm run install:all

# Démarrage des services en parallèle
npm run dev
# Ou individuellement:
npm run dev:trackdoc  # Port 3002
npm run dev:bff       # Port 3001
```

### Configuration Base de Données
```bash
# TrackDoc service
cd services/trackdoc
cp .env.example .env
# Configurer DATABASE_URL dans .env
npm run db:push
npm run db:migrate
```

## Scripts Disponibles

### Root (Workspace)
- `npm run dev` - Démarre tous les services
- `npm run build` - Build tous les services
- `npm run test` - Tests de tous les services
- `npm run install:all` - Installation complète

### TrackDoc Service
- `npm run dev` - Serveur TrackDoc (port 3002)
- `npm run build` - Build production
- `npm run test` - Tests unitaires
- `npm run db:*` - Commandes Prisma

### BFF Service  
- `npm run dev` - Serveur BFF (port 3001)
- `npm run build` - Build production
- `npm run test` - Tests unitaires

## Endpoints Principaux

### BFF (Optimisés Frontend)
```bash
# Dashboard principal
GET /api/bff/dashboard

# Vue produit complète
GET /api/bff/dashboard/products/:id/overview

# Stats rapides
GET /api/bff/dashboard/stats/summary

# Health check
GET /health
```

### TrackDoc (CRUD Pure)
```bash
# Products
GET|POST /api/doc/products
GET|PUT|DELETE /api/doc/products/:id

# Pages
GET|POST /api/doc/products/:id/pages
GET|PUT|DELETE /api/doc/pages/:id

# Events
GET|POST /api/doc/pages/:id/events
GET|PUT|DELETE /api/doc/events/:id
```

## Tests

```bash
# Tous les tests
npm test

# Tests par service
npm run test:trackdoc
npm run test:bff

# Tests avec coverage
npm run test:trackdoc -- --coverage
```

## Avantages de l'Architecture BFF

✅ **Performance** : Données pré-agrégées, moins de requêtes frontend
✅ **UX** : Endpoints optimisés pour chaque écran  
✅ **Évolutivité** : Services indépendants, déploiements séparés
✅ **Intégration** : Prêt pour TrackmAPI (audit temps réel)
✅ **Maintenance** : Responsabilités claires, code modulaire

## Structure des Données

Hiérarchie : **Product** → **Page** → **Event**
Plus **Variables Library** et **Suggested Values** partagées.

Voir `CLAUDE.md` pour la spécification complète.

## Future : Integration TrackmAPI

Le BFF est conçu pour intégrer facilement TrackmAPI (audit temps réel) :
- Comparaison plan documenté vs audit réel
- Health score basé sur conformité  
- Détection automatique d'events non documentés

## Contribution

1. Créer une branche `feature/nom-feature`
2. Développer et tester
3. Pull request vers master

**Architecture validée et tests passants** ✅