# TrackMap Web Application

Interface web type "Airtable du tracking" pour documenter et maintenir les plans de tracking GA4. Remplace les fichiers Excel manuels par une solution collaborative moderne.

## Architecture

- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Node.js + Express + TypeScript (port 3001) 
- **Database**: PostgreSQL + Prisma ORM
- **Structure**: Monorepo avec frontend/ et backend/

## Installation

### Prérequis
- Node.js 18+
- PostgreSQL
- npm ou yarn

### Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurer DATABASE_URL dans .env
npm run db:push
npm run dev
```

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## Scripts Disponibles

### Backend
- `npm run dev` - Développement avec hot reload
- `npm run build` - Build production
- `npm run db:push` - Synchroniser schéma Prisma
- `npm run db:migrate` - Créer migration
- `npm run db:studio` - Interface Prisma Studio

### Frontend  
- `npm run dev` - Serveur de développement
- `npm run build` - Build production
- `npm run lint` - Linter ESLint

## Modèles de Données

Hiérarchie: **Product** → **Instance** (optionnel) → **Page** → **Event**

Plus **Variables Library** et **Suggested Values** partagées au niveau produit.

Voir `CLAUDE.md` pour la spécification complète.

## Environnements

- dev, staging, prod configurables
- URLs par environnement pour chaque page
- Gestion via Product ou Instance selon `has_instances`

## Contribution

1. Créer une branche feature
2. Développer et tester
3. Pull request vers master