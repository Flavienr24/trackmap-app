# TrackMap — Audit Sécurité & Optimisation

Périmètre: Frontend (React/Vite), TrackDoc (API), BFF.  
Date: 2025‑09‑24

## Synthèse exécutive (priorisée)

- P0 — Auth manquante: aucune authentification/autorisation sur TrackDoc/BFF (risque élevé de modifications/suppressions non autorisées).
- P0 — CORS trop permissif: `cors()` sans liste d’origines autorisées.
- P0 — Logs sensibles: corps de requête et réponses d’erreur potentiellement loggés (risque PII/fuite d’infos).
- P0 — Proxy BFF inadéquat pour uploads: perte des en‑têtes et du flux multipart; le Front contourne le BFF via proxy Vite.
- P0 — Incohérence PDF: multer accepte PDF mais Cloudinary est configuré « image only » (échec des PDFs).
- P1 — Prisma client dupliqué: deux instances concurrentes (cohérence connexion/arrêt).
- P1 — Rate limiting global: non monté alors qu’un middleware existe.
- P1 — Front: bundle initial lourd (pas de code‑splitting), tables non virtualisées, transformation profonde des réponses coûteuse.
- P1 — Vite proxy → TrackDoc (3002) au lieu du BFF (architecture contournée).
- P2 — Hygiène: artefacts DB committés; `.env.example` incohérent; versions React divergentes.

---

## Détails et recommandations

### 1) Sécurité (P0)

1. Authentification/Autorisation absentes
   - Constat: aucun contrôle d’accès sur les routes CRUD/Upload.
   - Reco (court terme): API key via `Authorization: Bearer <token>` vérifiée au BFF puis relayée à TrackDoc.
   - Reco (moyen terme): JWT/stateless avec rôles/scopes (lecture/écriture), rotation des clés.

2. CORS trop permissif
   - Constat: CORS activé sans restriction.
   - Fichier: `services/trackdoc/src/index.ts:28`
   - Reco: restreindre aux origines connues et activer `credentials` si nécessaire.
   - Exemple:
     ```ts
     app.use(cors({
       origin: (process.env.FRONTEND_URL || '').split(',').filter(Boolean),
       credentials: true,
     }));
     ```

3. Logs sensibles
   - Constat: logging du corps de requête/réponse d’erreur.
   - Fichiers:
     - `services/trackdoc/src/middleware/errorHandler.ts:40` (éviter `req.body` complet)
     - `services/trackdoc/src/middleware/requestLogger.ts:27` (éviter `responseBody`)
   - Reco: limiter aux métadonnées (taille, clés autorisées, hash), expurger PII.

4. Proxy BFF pour uploads et en‑têtes
   - Constat: proxy actuel reconstruit la requête via Axios (`req.body`) et perd multipart/headers.
   - Fichier: `services/bff/src/routes/proxy.ts:33-44`
   - Reco: utiliser `http-proxy-middleware` pour un proxy de flux et transférer les en‑têtes (`Authorization`, `Cookie`, `Content-Type`).
   - Notes: retirer le `Content-Type: application/json` global du client Axios.
     - `services/bff/src/services/trackdocClient.ts:15`

5. Upload PDF incohérent
   - Constat: multer accepte `application/pdf` (`uploadMiddleware.ts`) mais Cloudinary est `resource_type: 'image'` (`cloudinaryService.ts`).
   - Reco (choix) :
     - A) Refuser PDF (simple/rapide): retirer MIME/extension PDF côté back et `.pdf` côté Front.
     - B) Supporter PDF: `resource_type: 'auto'`, `allowed_formats` incluant `pdf`, et miniature adaptée.

6. Rate limiting global non appliqué (P1)
   - Constat: `apiRateLimit` existe mais n’est pas monté.
   - Fichier: `services/trackdoc/src/middleware/rateLimiter.ts:60`
   - Reco: monter `app.use(apiRateLimit)` après Helmet/CORS.

### 2) Performance

Frontend
- Code‑splitting manquant (P1)
  - `frontend/src/App.tsx`: charger les pages via `React.lazy` + `Suspense`.
- Transformation profonde des clés (P1)
  - `frontend/src/services/api.ts`: `transformApiData` coûteux et fragile. Standardiser le contrat en camelCase et adapter les types.
- Tables non virtualisées (P1)
  - `frontend/src/components/organisms/DataTable.tsx`: utiliser `react-virtual`/`react-window` pour longues listes.
- Cloudinary cloud name en dur (P1)
  - `frontend/src/utils/screenshotUtils.ts:45`: remplacer par config (`VITE_CLOUDINARY_CLOUD_NAME`) ou utiliser `thumbnail_url` servie par l’API.

TrackDoc
- Payloads volumineux (P1)
  - `getAllProducts` inclut pages + events (N volumétrique).
  - Fichier: `services/trackdoc/src/controllers/productsController.ts`
  - Reco: endpoints « light » + pagination/tri/filtre standardisés.
- Indexes manquants (P2)
  - Reco: ajouter des `@@index` (ex.: Event: `pageId`, `status`, `updatedAt`; Page: `productId`).

BFF
- Proxy/streaming (P0/P1)
  - Reco: proxy de flux (voir § Sécurité#4), cache optionnel en lecture, rate‑limit global.

### 3) Architecture & Robustesse

- Prisma client dupliqué (P1)
  - Constat: `index.ts` instancie `new PrismaClient()`, alors qu’un singleton `db` existe.
  - Fichiers: `services/trackdoc/src/index.ts:24`, `services/trackdoc/src/config/database.ts`
  - Reco: utiliser `db` partout (health/shutdown inclus) pour une gestion homogène.

- Topologie Front ↔ API incohérente (P1)
  - Constat: Vite proxy vers TrackDoc (3002) au lieu du BFF (3001).
  - Fichier: `frontend/vite.config.ts:19-21`
  - Reco: pointer le Front vers le BFF pour centraliser auth, logs, rate‑limit.

- Conventions de nommage (P2)
  - Constat: Front convertit les clés en snake_case; Back/Prisma exposent camelCase.
  - Reco: standardiser camelCase de bout en bout et supprimer la conversion profonde.

### 4) Hygiène du dépôt (P2)

- Artefacts DB committés
  - Constat: `dev.db` à la racine; backups sous `services/trackdoc/prisma/backups/`.
  - Reco: nettoyer l’historique si sensible, renforcer `.gitignore` et pipeline CI (secrets scan).
- `.env.example` incohérent
  - Constat: `PORT=3001` alors que le service écoute 3002 par défaut.
  - Fichier: `services/trackdoc/.env.example:6`
- Versions React divergentes
  - Constat: racine en React 19, Front en React 18.
  - Fichiers: `package.json`, `frontend/package.json`
  - Reco: unifier pour éviter duplications/runtime incompatibles.

---

## Extraits de mise en œuvre

1) CORS restreint (TrackDoc)
```ts
// services/trackdoc/src/index.ts
app.use(cors({
  origin: (process.env.FRONTEND_URL || '').split(',').filter(Boolean),
  credentials: true,
}));
```

2) Rate limiting global
```ts
// services/trackdoc/src/index.ts
import { apiRateLimit } from './middleware/rateLimiter';
app.use(apiRateLimit);
```

3) Proxy BFF de flux (uploads, en‑têtes)
```ts
// services/bff/src/routes/proxy.ts
import { createProxyMiddleware } from 'http-proxy-middleware';
router.use('/api', createProxyMiddleware({
  target: config.services.trackdoc.baseUrl,
  changeOrigin: true,
  preserveHeaderKeyCase: true,
  xfwd: true,
}));
```
Supprimer l’en‑tête global `Content-Type` côté Axios client pour laisser le proxy gérer multipart.

4) Upload PDF — choix
- A) Images uniquement: retirer `application/pdf` et `.pdf` côté back/front.
- B) Support PDF: `resource_type: 'auto'` + `allowed_formats: ['jpg','jpeg','png','gif','webp','pdf']` et gestion des miniatures PDF.

5) Front — code‑splitting
```tsx
// frontend/src/App.tsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
// ... idem pour les autres pages
```

6) Virtualisation DataTable
- Introduire `react-virtual`/`react-window` pour le rendu de lignes (liste paginée + fenêtre visible).

---

## Plan d’action (proposé)

Semaine 1 — P0
- Auth API key (BFF + TrackDoc).
- CORS restreint.
- Logs sanitizés (remplacer log body/response body par métadonnées).
- Proxy BFF http‑proxy‑middleware + retrait `Content-Type` forcé côté Axios client.
- Politique PDF (A: images only recommandé pour démarrer).

Semaine 2 — P1
- Unifier Prisma client (utiliser `db` partout) et shutdown cohérent.
- Activer `apiRateLimit` globalement.
- Re‑pointer Vite vers BFF (3001) et supprimer chemins directs.
- Front: lazy loading pages + virtualisation DataTable.
- Cloudinary: lire le cloud name depuis la config env ou utiliser `thumbnail_url` du backend.

Semaine 3 — P2
- Pagination/tri/filtre/compte sur endpoints listants + ETag/Cache‑Control.
- Indexes Prisma sur colonnes filtrées/triées.
- Standardiser camelCase et supprimer la conversion profonde côté front.
- Hygiène dépôt: retirer artefacts DB/backups, corriger `.env.example`, unifier versions React.
- Validation schémas (zod/Joi) sur corps/query/params.

---

## Checklists par équipe

Backend (TrackDoc)
- [ ] Restreindre CORS (origines)
- [ ] Monter `apiRateLimit` global
- [ ] Unifier Prisma `db` (health/shutdown inclus)
- [ ] Standardiser camelCase dans les réponses
- [ ] Pagination/tri/filtre/compte sur endpoints listants
- [ ] Indexes Prisma (Event: `pageId`, `status`, `updatedAt`; Page: `productId`)
- [ ] Politique PDF (A ou B) et tests d’upload
- [ ] Sanitariser logs (pas de body complet)

BFF
- [ ] Proxy http‑proxy‑middleware avec transfert d’en‑têtes
- [ ] Ne pas forcer `Content-Type` global dans Axios client
- [ ] Rate‑limit global
- [ ] Auth (API key/JWT) et relais au TrackDoc

Frontend
- [ ] Pointer `/api` vers le BFF (Vite)
- [ ] Code‑splitting (React.lazy/Suspense)
- [ ] Virtualisation DataTable
- [ ] Supprimer `transformApiData` et types alignés camelCase
- [ ] Cloudinary: pas de cloud name en dur; utiliser `thumbnail_url` ou env
- [ ] Si PDF refusé: retirer `.pdf` de `DragDropZone.accept`

DevOps/Infra
- [ ] Purger artefacts DB/backups du VCS si sensibles
- [ ] Durcir `.gitignore` (DB/backups, logs)
- [ ] Harmoniser versions React (monorepo)
- [ ] Pipelines: secrets scan, vérif `.env.example` (PORT=3002), `NODE_ENV=production` en prod

---

## Références code (repères)

- CORS: `services/trackdoc/src/index.ts:28`
- Logs (error handler): `services/trackdoc/src/middleware/errorHandler.ts:40`
- Logs (request logger): `services/trackdoc/src/middleware/requestLogger.ts:27`
- Rate limiter global: `services/trackdoc/src/middleware/rateLimiter.ts:60`
- Prisma client dupliqué: `services/trackdoc/src/index.ts:24`, `services/trackdoc/src/config/database.ts:1`
- Health DB: `services/trackdoc/src/index.ts:57`
- BFF proxy (multipart/headers): `services/bff/src/routes/proxy.ts:33`, `:38-44`
- Axios `Content-Type` forcé: `services/bff/src/services/trackdocClient.ts:15`
- Upload PDF accepté: `services/trackdoc/src/middleware/uploadMiddleware.ts:11`
- Cloudinary image‑only: `services/trackdoc/src/services/cloudinaryService.ts:55`
- Vite proxy → TrackDoc: `frontend/vite.config.ts:19-21`
- Cloudinary cloud name hardcodé: `frontend/src/utils/screenshotUtils.ts:45`
- DataTable (non virtualisée): `frontend/src/components/organisms/DataTable.tsx:1`
- Conversion profonde des réponses: `frontend/src/services/api.ts:33`
- `.env.example` incohérent: `services/trackdoc/.env.example:6`
- Artefacts DB committés: `dev.db:1`, `services/trackdoc/prisma/backups/*`

---

Notes
- Les usages ponctuels de Prisma `$queryRaw` pour health check sont sous forme taggée (sécurisé). Pas de vulnérabilité SQLi identifiée.
- Helmet est bien en place; compléter par HSTS en production et envisager une CSP adaptée selon vos flux.

