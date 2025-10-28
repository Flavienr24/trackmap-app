# Roadmap Event Definitions - Phases Backend & Frontend

**Objectif** : Transformer la page Events d'une liste d'occurrences en un glossaire de définitions canoniques.

**Status Global** :
- ✅ **Pass 1 Migration** : Complété et vérifié (14 events préservés)
- 📝 **Pass 2 Migration** : Scripts prêts (backfill + verification)
- 🔨 **Phase Backend** : En attente (ce document)
- 🔨 **Phase Frontend** : En attente (ce document)
- ⏳ **Pass 3 Migration** : Planifié (NOT NULL constraint)

---

## Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [Phase 2 - Backend API EventDefinitions](#phase-2---backend-api-eventdefinitions)
3. [Phase 3 - Backend Rétrocompatibilité](#phase-3---backend-rétrocompatibilité)
4. [Phase 4 - Frontend Types & Services](#phase-4---frontend-types--services)
5. [Phase 5 - Frontend EventsList Glossary](#phase-5---frontend-eventslist-glossary)
6. [Phase 6 - Frontend EventDetail Page](#phase-6---frontend-eventdetail-page)
7. [Phase 7 - Frontend CreateEventModal Adaptatif](#phase-7---frontend-createeventmodal-adaptatif)
8. [Phase 8 - Frontend Hooks & Optimisations](#phase-8---frontend-hooks--optimisations)
9. [Pass 3 Migration - Cleanup](#pass-3-migration---cleanup)
10. [Testing Strategy](#testing-strategy)

---

## Architecture Globale

### Modèles de Données (Rappel)

```prisma
model EventDefinition {
  id                  String    @id @default(cuid())
  productId           String    @map("product_id")
  name                String
  description         String    // À remplir manuellement post-backfill
  userInteractionType String    @map("user_interaction_type") // "click" | "page_load" | "interaction"
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  product             Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  events              Event[]
  history             EventDefinitionHistory[]

  @@unique([productId, name])
  @@index([productId])
  @@map("event_definitions")
}

model Event {
  id                String      @id @default(cuid())
  pageId            String      @map("page_id")
  eventDefinitionId String?     @map("event_definition_id") // Nullable en Pass 1-2, NOT NULL en Pass 3
  name              String      // Shadow column (à dropper en Pass 3 post-production)
  // ... autres champs existants

  eventDefinition   EventDefinition? @relation(fields: [eventDefinitionId], references: [id])
  // ... autres relations
}
```

### Flux de Données

```
User Action (Frontend)
    ↓
CreateEventModal
    ↓
POST /api/events (existing endpoint - adapté)
    ↓
Auto-resolve EventDefinition
    ├─ EventDefinition exists → Link via eventDefinitionId
    └─ EventDefinition missing → Create + Link
    ↓
Event créé avec eventDefinitionId
    ↓
Frontend reçoit Event + eventDefinition included
    ↓
UI updated (EventsList / EventDetail)
```

---

## Phase 2 - Backend API EventDefinitions

### 2.1 - Controller EventDefinitions

**Fichier** : `services/trackdoc/src/controllers/eventDefinitionsController.ts`

#### Endpoints à créer :

##### `GET /api/event-definitions`
Liste toutes les EventDefinitions (tous produits)

**Query params** :
- `productId` (optional) : Filtrer par produit
- `search` (optional) : Recherche par nom/description

**Response** :
```typescript
{
  success: true,
  data: EventDefinition[],
  count: number
}
```

**Logique** :
- Fetch EventDefinitions avec `include: { product: true, _count: { select: { events: true } } }`
- Tri par `name` ASC
- Logger chaque requête

---

##### `GET /api/products/:productId/event-definitions`
Liste EventDefinitions pour un produit spécifique

**Query params** :
- `include_stats` (optional, boolean) : Inclure agrégations (lazy cache 5min)

**Response** :
```typescript
{
  success: true,
  data: EventDefinition[],
  count: number,
  stats?: {
    totalDefinitions: number,
    totalEvents: number,
    avgEventsPerDefinition: number
  }
}
```

**Headers** :
- `X-Cache-TTL: 300` si `include_stats=true` (5 min cache)

**Logique** :
- Vérifier que le produit existe
- Fetch EventDefinitions avec counts
- Si `include_stats`, calculer agrégations et logger cache TTL

---

##### `GET /api/event-definitions/:id`
Détail d'une EventDefinition

**Response** :
```typescript
{
  success: true,
  data: {
    ...EventDefinition,
    product: Product,
    events: Event[], // Limité à 100 events
    history: EventDefinitionHistory[],
    _count: { events: number }
  }
}
```

**Logique** :
- Include product, events (take 100), history (orderBy createdAt DESC)
- 404 si non trouvée

---

##### `POST /api/products/:productId/event-definitions`
Créer une nouvelle EventDefinition

**Body** :
```typescript
{
  name: string, // required
  description?: string,
  userInteractionType?: string // default "interaction"
}
```

**Validation** :
- `name` : required, trimmed, non-empty
- Vérifier unicité `(productId, name)` via Prisma unique constraint
- `userInteractionType` : enum ["click", "page_load", "interaction", "form_submit", "scroll", "other"]

**Logique** :
```typescript
// Transaction
const eventDefinition = await prisma.$transaction(async (tx) => {
  // Create EventDefinition
  const def = await tx.eventDefinition.create({ ... });

  // Create history entry
  await tx.eventDefinitionHistory.create({
    data: {
      eventDefinitionId: def.id,
      field: 'created',
      oldValue: null,
      newValue: `Manually created by user`,
      author: 'user' // TODO: Replace with authenticated user
    }
  });

  return def;
});
```

**Response** : 201 + EventDefinition créée

---

##### `PUT /api/event-definitions/:id`
Modifier une EventDefinition

**Body** :
```typescript
{
  name?: string,
  description?: string,
  userInteractionType?: string
}
```

**Logique Critique - Rename Propagation** :
```typescript
// Si name change → Propagation transactionnelle
if (name && name !== existingDef.name) {
  await prisma.$transaction(async (tx) => {
    // 1. Update EventDefinition
    const updated = await tx.eventDefinition.update({
      where: { id },
      data: { name, description, userInteractionType }
    });

    // 2. Propagate name to all Events (shadow column sync)
    await tx.event.updateMany({
      where: { eventDefinitionId: id },
      data: { name }
    });

    // 3. Create history entry for rename
    await tx.eventDefinitionHistory.create({
      data: {
        eventDefinitionId: id,
        field: 'name',
        oldValue: existingDef.name,
        newValue: name,
        author: 'user'
      }
    });

    // 4. Log rename propagation
    logger.info('EventDefinition renamed with propagation', {
      eventDefinitionId: id,
      oldName: existingDef.name,
      newName: name,
      eventsUpdated: await tx.event.count({ where: { eventDefinitionId: id } })
    });

    return updated;
  });
}
```

**Validation** :
- Si `name` change, vérifier unicité `(productId, newName)`
- Logger toutes les modifications

**Response** : 200 + EventDefinition mise à jour

---

##### `DELETE /api/event-definitions/:id`
Supprimer une EventDefinition

**Logique** :
```typescript
// Vérifier qu'aucun Event n'est lié
const eventsCount = await prisma.event.count({
  where: { eventDefinitionId: id }
});

if (eventsCount > 0) {
  throw new AppError(
    `Cannot delete EventDefinition: ${eventsCount} events are still linked`,
    400
  );
}

// Delete (cascade will handle history)
await prisma.eventDefinition.delete({ where: { id } });
```

**Response** : 200 + message de confirmation

---

##### `GET /api/event-definitions/:id/history`
Historique d'une EventDefinition

**Response** :
```typescript
{
  success: true,
  data: EventDefinitionHistory[],
  count: number
}
```

**Logique** :
- OrderBy createdAt DESC
- Logger fetch

---

### 2.2 - Routes EventDefinitions

**Fichier** : `services/trackdoc/src/routes/eventDefinitions.ts`

```typescript
import express from 'express';
import * as eventDefinitionsController from '../controllers/eventDefinitionsController';

const router = express.Router();

// Global EventDefinitions routes
router.get('/', eventDefinitionsController.getAllEventDefinitions);
router.get('/:id', eventDefinitionsController.getEventDefinitionById);
router.put('/:id', eventDefinitionsController.updateEventDefinition);
router.delete('/:id', eventDefinitionsController.deleteEventDefinition);
router.get('/:id/history', eventDefinitionsController.getEventDefinitionHistory);

// Product-specific EventDefinitions routes (à monter dans products.ts)
// GET /api/products/:productId/event-definitions
// POST /api/products/:productId/event-definitions

export default router;
```

**Montage dans `services/trackdoc/src/app.ts`** :
```typescript
import eventDefinitionsRoutes from './routes/eventDefinitions';

app.use('/api/event-definitions', eventDefinitionsRoutes);
```

---

## Phase 3 - Backend Rétrocompatibilité

### 3.1 - Adapter Events Controller

**Fichier** : `services/trackdoc/src/controllers/eventsController.ts`

#### Modifications à apporter :

##### `createEvent` - Auto-resolve EventDefinition

**Nouvelle logique** :
```typescript
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  const { id: pageId } = req.params;
  const { name, status, testDate, properties } = req.body;

  // ... validations existantes ...

  // Get page with product
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { product: true }
  });

  if (!page) {
    throw new AppError('Page not found', 404);
  }

  // NOUVELLE LOGIQUE : Auto-resolve or create EventDefinition
  const event = await prisma.$transaction(async (tx) => {
    // 1. Find or create EventDefinition
    let eventDefinition = await tx.eventDefinition.findUnique({
      where: {
        productId_name: {
          productId: page.productId,
          name
        }
      }
    });

    if (!eventDefinition) {
      // Create EventDefinition with default values
      eventDefinition = await tx.eventDefinition.create({
        data: {
          productId: page.productId,
          name,
          description: '', // Empty - to be filled manually
          userInteractionType: 'interaction' // Default
        }
      });

      // Create history entry
      await tx.eventDefinitionHistory.create({
        data: {
          eventDefinitionId: eventDefinition.id,
          field: 'auto-created',
          oldValue: null,
          newValue: `Auto-created from event creation on page ${page.name}`,
          author: 'system'
        }
      });

      logger.info('Auto-created EventDefinition from event creation', {
        eventDefinitionId: eventDefinition.id,
        productId: page.productId,
        name,
        pageId
      });
    }

    // 2. Auto-create properties/values (existing logic)
    if (properties) {
      await autoCreatePropertiesInTx(tx, page.productId, properties);
      await autoCreateSuggestedValuesInTx(tx, page.productId, properties);
    }

    // 3. Create Event with eventDefinitionId
    return await tx.event.create({
      data: {
        pageId,
        eventDefinitionId: eventDefinition.id, // NOUVEAU
        name, // Shadow column sync
        status: status ? status.toUpperCase() : 'TO_IMPLEMENT',
        testDate: testDate ? new Date(testDate) : null,
        properties: properties ? JSON.stringify(properties) : '{}'
      },
      include: {
        page: { include: { product: true } },
        eventDefinition: true, // NOUVEAU include
        comments: true,
        history: true
      }
    });
  });

  // Parse and respond
  const eventResponse = {
    ...event,
    properties: safeJsonParse(event.properties, {}),
    screenshots: safeJsonParse(event.screenshots, [])
  };

  res.status(201).json({
    success: true,
    data: eventResponse
  });
};
```

---

##### `updateEvent` - Sync name avec EventDefinition

**Modification** :
```typescript
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, status, testDate, properties } = req.body;

  // ... existing validation ...

  const existingEvent = await prisma.event.findUnique({
    where: { id },
    include: {
      page: { include: { product: true } },
      eventDefinition: true
    }
  });

  if (!existingEvent) {
    throw new AppError('Event not found', 404);
  }

  // NOUVELLE VALIDATION : Si name change, warning si EventDefinition liée
  if (name && name !== existingEvent.name && existingEvent.eventDefinitionId) {
    logger.warn('Attempting to change Event name while linked to EventDefinition', {
      eventId: id,
      eventDefinitionId: existingEvent.eventDefinitionId,
      currentName: existingEvent.name,
      newName: name
    });

    // Option A : Interdire le rename
    throw new AppError(
      'Cannot rename Event while linked to EventDefinition. Use EventDefinition rename instead.',
      400
    );

    // Option B : Permettre mais logger warning (décision à valider avec dev)
    // Le rename sera écrasé lors de la prochaine sync EventDefinition → Events
  }

  // ... rest of existing update logic ...
};
```

**Décision requise** : Comment gérer le rename d'un Event lié à une EventDefinition ?
- **Option A** : Interdire (recommandé pour cohérence)
- **Option B** : Permettre mais logger warning (peut créer incohérences)

---

##### Tous les endpoints Events - Include eventDefinition

**Modification globale** :

Dans tous les endpoints renvoyant des Events (`getEventsByPage`, `getEventById`, `updateEvent`, etc.), ajouter :

```typescript
include: {
  page: { include: { product: true } },
  eventDefinition: true, // NOUVEAU
  comments: true,
  history: true
}
```

---

## Phase 4 - Frontend Types & Services

### 4.1 - Types TypeScript

**Fichier** : `frontend/src/types/eventDefinitions.ts`

```typescript
export interface EventDefinition {
  id: string;
  productId: string;
  name: string;
  description: string;
  userInteractionType: 'click' | 'page_load' | 'interaction' | 'form_submit' | 'scroll' | 'other';
  createdAt: string;
  updatedAt: string;

  // Relations (optional selon include)
  product?: Product;
  events?: Event[];
  history?: EventDefinitionHistory[];
  _count?: {
    events: number;
  };
}

export interface EventDefinitionHistory {
  id: string;
  eventDefinitionId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  author: string | null;
  createdAt: string;

  eventDefinition?: EventDefinition;
}

export interface EventDefinitionStats {
  totalDefinitions: number;
  totalEvents: number;
  avgEventsPerDefinition: number;
}

export interface EventDefinitionListResponse {
  success: boolean;
  data: EventDefinition[];
  count: number;
  stats?: EventDefinitionStats;
}

export interface EventDefinitionDetailResponse {
  success: boolean;
  data: EventDefinition;
}

export interface CreateEventDefinitionInput {
  name: string;
  description?: string;
  userInteractionType?: EventDefinition['userInteractionType'];
}

export interface UpdateEventDefinitionInput {
  name?: string;
  description?: string;
  userInteractionType?: EventDefinition['userInteractionType'];
}
```

**Mettre à jour** : `frontend/src/types/events.ts`

```typescript
import { EventDefinition } from './eventDefinitions';

export interface Event {
  id: string;
  pageId: string;
  eventDefinitionId: string | null; // NOUVEAU (nullable en Pass 2)
  name: string; // Shadow column
  // ... existing fields ...

  // Relations
  page?: Page;
  eventDefinition?: EventDefinition; // NOUVEAU
  comments?: Comment[];
  history?: EventHistory[];
}
```

---

### 4.2 - API Service

**Fichier** : `frontend/src/services/eventDefinitionsService.ts`

```typescript
import api from './api';
import type {
  EventDefinition,
  EventDefinitionHistory,
  EventDefinitionListResponse,
  EventDefinitionDetailResponse,
  CreateEventDefinitionInput,
  UpdateEventDefinitionInput
} from '../types/eventDefinitions';

export const eventDefinitionsService = {
  /**
   * Get all EventDefinitions
   */
  async getAll(params?: {
    productId?: string;
    search?: string;
  }): Promise<EventDefinitionListResponse> {
    const response = await api.get<EventDefinitionListResponse>('/event-definitions', { params });
    return response.data;
  },

  /**
   * Get EventDefinitions for a product
   */
  async getByProduct(
    productId: string,
    includeStats: boolean = false
  ): Promise<EventDefinitionListResponse> {
    const response = await api.get<EventDefinitionListResponse>(
      `/products/${productId}/event-definitions`,
      { params: { include_stats: includeStats } }
    );
    return response.data;
  },

  /**
   * Get EventDefinition by ID
   */
  async getById(id: string): Promise<EventDefinitionDetailResponse> {
    const response = await api.get<EventDefinitionDetailResponse>(`/event-definitions/${id}`);
    return response.data;
  },

  /**
   * Create EventDefinition
   */
  async create(
    productId: string,
    input: CreateEventDefinitionInput
  ): Promise<EventDefinitionDetailResponse> {
    const response = await api.post<EventDefinitionDetailResponse>(
      `/products/${productId}/event-definitions`,
      input
    );
    return response.data;
  },

  /**
   * Update EventDefinition
   */
  async update(
    id: string,
    input: UpdateEventDefinitionInput
  ): Promise<EventDefinitionDetailResponse> {
    const response = await api.put<EventDefinitionDetailResponse>(
      `/event-definitions/${id}`,
      input
    );
    return response.data;
  },

  /**
   * Delete EventDefinition
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/event-definitions/${id}`);
    return response.data;
  },

  /**
   * Get EventDefinition history
   */
  async getHistory(id: string): Promise<{
    success: boolean;
    data: EventDefinitionHistory[];
    count: number;
  }> {
    const response = await api.get(`/event-definitions/${id}/history`);
    return response.data;
  }
};
```

---

## Phase 5 - Frontend EventsList Glossary

### 5.1 - Refonte EventsList Component

**Fichier** : `frontend/src/pages/EventsList.tsx`

**Transformation** :
- **Avant** : Liste de tous les Events (avec duplicates)
- **Après** : Glossaire des EventDefinitions (unique par nom)

**Nouvelle structure** :

```tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventDefinitionsService } from '../services/eventDefinitionsService';
import type { EventDefinition } from '../types/eventDefinitions';

export const EventsList: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [definitions, setDefinitions] = useState<EventDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!productId) return;

    const fetchDefinitions = async () => {
      try {
        setLoading(true);
        const response = await eventDefinitionsService.getByProduct(productId, true);
        setDefinitions(response.data);
      } catch (err) {
        setError('Failed to fetch event definitions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDefinitions();
  }, [productId]);

  // Filter logic
  const filteredDefinitions = definitions.filter(def => {
    const matchesSearch = search === '' ||
      def.name.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'all' ||
      def.userInteractionType === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="events-list-container">
      <header className="events-list-header">
        <h1>Event Definitions Glossary</h1>
        <p className="subtitle">
          {definitions.length} unique events defined
        </p>
      </header>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="click">Click</option>
          <option value="page_load">Page Load</option>
          <option value="interaction">Interaction</option>
          <option value="form_submit">Form Submit</option>
          <option value="scroll">Scroll</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Glossary Table */}
      <table className="definitions-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Description</th>
            <th>Type</th>
            <th>Occurrences</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDefinitions.map(def => (
            <tr key={def.id}>
              <td className="event-name">
                <Link to={`/products/${productId}/events/${encodeURIComponent(def.name)}`}>
                  {def.name}
                </Link>
              </td>
              <td className="description">
                {def.description || <em className="empty">No description</em>}
              </td>
              <td className="type">
                <Badge variant={getTypeVariant(def.userInteractionType)}>
                  {def.userInteractionType}
                </Badge>
              </td>
              <td className="occurrences">
                {def._count?.events || 0}
              </td>
              <td className="actions">
                <button
                  onClick={() => handleEdit(def)}
                  className="btn-icon"
                  title="Edit definition"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(def)}
                  className="btn-icon btn-danger"
                  title="Delete definition"
                  disabled={def._count?.events > 0}
                >
                  <DeleteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredDefinitions.length === 0 && (
        <EmptyState
          title="No event definitions found"
          description={search ? "Try adjusting your search" : "Create your first event definition"}
        />
      )}
    </div>
  );
};
```

**Routing** : `/products/:productId/events` → EventsList (glossary)

---

## Phase 6 - Frontend EventDetail Page

### 6.1 - Nouvelle Page EventDetail

**Fichier** : `frontend/src/pages/EventDetail.tsx`

**Route** : `/products/:productId/events/:eventName`

**Fonctionnalités** :
1. Afficher EventDefinition (name, description, userInteractionType)
2. Lister toutes les occurrences (Events liés)
3. Permettre édition inline de description/type
4. Afficher historique de la définition
5. Créer nouvelle occurrence depuis cette page

**Structure** :

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventDefinitionsService } from '../services/eventDefinitionsService';
import { eventsService } from '../services/eventsService';
import type { EventDefinition } from '../types/eventDefinitions';
import type { Event } from '../types/events';

export const EventDetail: React.FC = () => {
  const { productId, eventName } = useParams<{ productId: string; eventName: string }>();
  const [definition, setDefinition] = useState<EventDefinition | null>(null);
  const [occurrences, setOccurrences] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!productId || !eventName) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch EventDefinition by product + name
        const defsResponse = await eventDefinitionsService.getByProduct(productId);
        const def = defsResponse.data.find(d => d.name === decodeURIComponent(eventName));

        if (!def) {
          throw new Error('Event definition not found');
        }

        setDefinition(def);

        // Fetch all Events linked to this definition
        const eventsResponse = await eventsService.getByEventDefinition(def.id);
        setOccurrences(eventsResponse.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, eventName]);

  const handleSaveDefinition = async (updates: Partial<EventDefinition>) => {
    if (!definition) return;

    try {
      const response = await eventDefinitionsService.update(definition.id, updates);
      setDefinition(response.data);
      setEditMode(false);
    } catch (err) {
      console.error('Failed to update definition', err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!definition) return <ErrorMessage message="Event definition not found" />;

  return (
    <div className="event-detail-container">
      {/* Header - EventDefinition Info */}
      <section className="definition-header">
        <h1>{definition.name}</h1>

        {editMode ? (
          <EditDefinitionForm
            definition={definition}
            onSave={handleSaveDefinition}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <div className="definition-info">
            <div className="info-field">
              <label>Description:</label>
              <p>{definition.description || <em>No description</em>}</p>
            </div>

            <div className="info-field">
              <label>Interaction Type:</label>
              <Badge variant={getTypeVariant(definition.userInteractionType)}>
                {definition.userInteractionType}
              </Badge>
            </div>

            <button onClick={() => setEditMode(true)} className="btn-edit">
              Edit Definition
            </button>
          </div>
        )}
      </section>

      {/* Occurrences List */}
      <section className="occurrences-section">
        <header className="section-header">
          <h2>Occurrences ({occurrences.length})</h2>
          <button className="btn-primary">
            + Add Occurrence
          </button>
        </header>

        <table className="occurrences-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Properties</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.map(event => (
              <tr key={event.id}>
                <td>{event.page?.name}</td>
                <td>
                  <PropertiesPreview properties={event.properties} />
                </td>
                <td>
                  <StatusBadge status={event.status} />
                </td>
                <td>{formatDate(event.updatedAt)}</td>
                <td>
                  <Link to={`/events/${event.id}`} className="btn-link">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* History Section */}
      <section className="history-section">
        <h2>Change History</h2>
        <EventDefinitionHistoryTimeline definitionId={definition.id} />
      </section>
    </div>
  );
};
```

**Composants utilitaires** :
- `EditDefinitionForm` : Formulaire inline pour éditer description/type
- `PropertiesPreview` : Affichage condensé des propriétés d'un Event
- `StatusBadge` : Badge coloré selon status
- `EventDefinitionHistoryTimeline` : Timeline de l'historique

---

## Phase 7 - Frontend CreateEventModal Adaptatif

### 7.1 - Modal Adaptatif

**Fichier** : `frontend/src/components/CreateEventModal.tsx`

**Comportement adaptatif** :

```tsx
import React, { useState, useEffect } from 'react';
import { eventDefinitionsService } from '../services/eventDefinitionsService';
import { eventsService } from '../services/eventsService';
import type { EventDefinition } from '../types/eventDefinitions';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  productId: string;
  onSuccess: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  pageId,
  productId,
  onSuccess
}) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [definitions, setDefinitions] = useState<EventDefinition[]>([]);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !productId) return;

    const fetchDefinitions = async () => {
      try {
        const response = await eventDefinitionsService.getByProduct(productId);
        setDefinitions(response.data);
      } catch (err) {
        console.error('Failed to fetch definitions', err);
      }
    };

    fetchDefinitions();
  }, [isOpen, productId]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (mode === 'select' && selectedDefinition) {
        // Reuse existing definition
        const definition = definitions.find(d => d.id === selectedDefinition);

        await eventsService.create({
          pageId,
          name: definition!.name, // Use definition name
          properties,
          status: 'TO_IMPLEMENT'
        });
      } else {
        // Create new event (auto-creates definition via backend)
        await eventsService.create({
          pageId,
          name: newEventName,
          properties,
          status: 'TO_IMPLEMENT'
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create event', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2>Create Event</h2>
      </ModalHeader>

      <ModalBody>
        {/* Mode Selection */}
        <div className="mode-selection">
          <button
            className={mode === 'select' ? 'active' : ''}
            onClick={() => setMode('select')}
          >
            Reuse Existing Event
          </button>
          <button
            className={mode === 'create' ? 'active' : ''}
            onClick={() => setMode('create')}
          >
            Create New Event
          </button>
        </div>

        {/* Select Existing */}
        {mode === 'select' && (
          <div className="select-mode">
            <label>Select Event Definition:</label>
            <select
              value={selectedDefinition || ''}
              onChange={(e) => setSelectedDefinition(e.target.value)}
            >
              <option value="">-- Select an event --</option>
              {definitions.map(def => (
                <option key={def.id} value={def.id}>
                  {def.name} ({def._count?.events || 0} occurrences)
                </option>
              ))}
            </select>

            {selectedDefinition && (
              <div className="definition-preview">
                <p><strong>Description:</strong> {definitions.find(d => d.id === selectedDefinition)?.description}</p>
                <p><strong>Type:</strong> {definitions.find(d => d.id === selectedDefinition)?.userInteractionType}</p>
              </div>
            )}
          </div>
        )}

        {/* Create New */}
        {mode === 'create' && (
          <div className="create-mode">
            <label>New Event Name:</label>
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="e.g., click_cta_button"
            />

            <p className="info">
              ℹ️ A new EventDefinition will be auto-created for this event.
            </p>
          </div>
        )}

        {/* Properties Editor (common) */}
        <PropertiesEditor
          properties={properties}
          onChange={setProperties}
        />
      </ModalBody>

      <ModalFooter>
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={loading || (mode === 'select' && !selectedDefinition) || (mode === 'create' && !newEventName)}
        >
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </ModalFooter>
    </Modal>
  );
};
```

---

## Phase 8 - Frontend Hooks & Optimisations

### 8.1 - Hook useEventDefinitionUsage

**Fichier** : `frontend/src/hooks/useEventDefinitionUsage.ts`

**Objectif** : Hook réutilisable avec auto-invalidation cache

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventDefinitionsService } from '../services/eventDefinitionsService';

export const useEventDefinitionUsage = (definitionId: string) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['eventDefinition', definitionId],
    queryFn: () => eventDefinitionsService.getById(definitionId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 10 * 60 * 1000
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['eventDefinition', definitionId] });
    queryClient.invalidateQueries({ queryKey: ['eventDefinitions'] });
  };

  return {
    definition: data?.data,
    occurrencesCount: data?.data._count?.events || 0,
    isLoading,
    error,
    refetch,
    invalidate
  };
};
```

### 8.2 - Query Keys Organization

**Fichier** : `frontend/src/services/queryKeys.ts`

```typescript
export const queryKeys = {
  eventDefinitions: {
    all: ['eventDefinitions'] as const,
    byProduct: (productId: string) => ['eventDefinitions', 'product', productId] as const,
    detail: (id: string) => ['eventDefinition', id] as const,
    history: (id: string) => ['eventDefinition', id, 'history'] as const
  },
  events: {
    all: ['events'] as const,
    byPage: (pageId: string) => ['events', 'page', pageId] as const,
    byDefinition: (definitionId: string) => ['events', 'definition', definitionId] as const,
    detail: (id: string) => ['event', id] as const
  }
};
```

---

## Pass 3 Migration - Cleanup

### Objectif
Après validation complète en production, nettoyer la shadow column et rendre la FK obligatoire.

**Timing** : Minimum 1-2 mois après Pass 2 en production

### Migration SQL

**Fichier** : `services/trackdoc/prisma/migrations/YYYYMMDDHHMMSS_event_definitions_pass3/migration.sql`

```sql
/*
  Migration Pass 3 – Event Definitions Cleanup
  - Make event_definition_id NOT NULL
  - Drop shadow column 'name' (optional, post-production validation)

  Prerequisites:
  - All events MUST have event_definition_id (verified by verify-migration-pass2.ts)
  - Production running stable on Pass 2 for at least 1-2 months
*/

-- Make event_definition_id required
ALTER TABLE "events" ALTER COLUMN "event_definition_id" SET NOT NULL;

-- Optional: Drop shadow column 'name' (only after extensive production validation)
-- ALTER TABLE "events" DROP COLUMN "name";
```

**Schema Prisma final** :

```prisma
model Event {
  id                String      @id @default(cuid())
  pageId            String      @map("page_id")
  eventDefinitionId String      @map("event_definition_id") // NOT NULL
  // name column dropped

  eventDefinition   EventDefinition @relation(fields: [eventDefinitionId], references: [id])
  // ... autres relations
}
```

---

## Testing Strategy

### Backend Tests

**Fichier** : `services/trackdoc/tests/eventDefinitions.test.ts`

**Scénarios de test** :

1. **CRUD EventDefinitions** :
   - ✅ Create EventDefinition avec validation
   - ✅ Get EventDefinitions par produit
   - ✅ Update EventDefinition (rename + propagation)
   - ✅ Delete EventDefinition (blocked si events liés)

2. **Auto-resolve lors de création Event** :
   - ✅ Event créé avec EventDefinition existante (reuse)
   - ✅ Event créé avec EventDefinition inexistante (auto-create)
   - ✅ Vérifier eventDefinitionId correctement lié

3. **Rename Propagation** :
   - ✅ Rename EventDefinition → tous les Events.name mis à jour
   - ✅ EventDefinitionHistory créé avec rename
   - ✅ Transaction atomique (all-or-nothing)

4. **Edge Cases** :
   - ✅ Création EventDefinition avec nom duplicate (doit échouer)
   - ✅ Delete EventDefinition avec events liés (doit échouer)
   - ✅ Update Event.name alors que eventDefinitionId existe (comportement selon décision)

### Frontend Tests

**Fichier** : `frontend/src/__tests__/EventsList.test.tsx`

**Scénarios** :

1. **Glossary Display** :
   - ✅ Affiche EventDefinitions (pas Events)
   - ✅ Filtre par search
   - ✅ Filtre par userInteractionType

2. **CreateEventModal** :
   - ✅ Mode "select" affiche liste EventDefinitions
   - ✅ Mode "create" permet nouveau nom
   - ✅ Soumission créé Event avec bon eventDefinitionId

3. **EventDetail** :
   - ✅ Affiche info EventDefinition
   - ✅ Liste toutes occurrences
   - ✅ Edit inline description/type

---

## Checklist Migration Complète

### ✅ Pass 1 - Schema & Verification
- [x] Migration 20251028142000_event_definitions_pass1
- [x] Tables event_definitions / event_definition_history créées
- [x] Colonne event_definition_id (nullable) ajoutée à events
- [x] Shadow column name préservée
- [x] verify-migration-pass1.ts exécuté (13/13 PASS)
- [x] log-migration-pass1.ts exécuté (5 EventDefinitions identifiées)

### 📝 Pass 2 - Back-fill (En attente)
- [ ] Review DIVERGENCES_REVIEW.md validée
- [ ] Corrections manuelles (article_author, page_view Homepage)
- [ ] backfill-event-definitions.ts exécuté
- [ ] verify-migration-pass2.ts exécuté (validations PASS)
- [ ] Remplissage manuel description + userInteractionType

### 🔨 Phase Backend
- [ ] eventDefinitionsController.ts créé
- [ ] Routes /api/event-definitions montées
- [ ] eventsController.ts adapté (auto-resolve)
- [ ] Tests backend passent
- [ ] Logs Winston configurés

### 🔨 Phase Frontend
- [ ] Types eventDefinitions.ts créés
- [ ] Service eventDefinitionsService.ts créé
- [ ] EventsList refactorisé (glossary)
- [ ] EventDetail page créée
- [ ] CreateEventModal adaptatif implémenté
- [ ] Hooks useEventDefinitionUsage créés
- [ ] Tests frontend passent

### ⏳ Pass 3 - Cleanup (Post-production)
- [ ] Production stable 1-2 mois sur Pass 2
- [ ] Migration Pass 3 créée
- [ ] event_definition_id NOT NULL appliqué
- [ ] (Optionnel) Shadow column name droppée

---

**Fin de la Roadmap**

Ce document constitue la spécification complète pour l'implémentation des EventDefinitions. Chaque phase peut être développée indépendamment après validation de la précédente.
