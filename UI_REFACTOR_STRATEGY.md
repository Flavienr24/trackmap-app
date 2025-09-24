# UI Refactor Strategy - Architecture SaaS avec Sidebar

## Objectif

Refonte complète de l'interface utilisateur pour adopter une architecture SaaS classique avec :
- Sidebar de navigation avec sélecteur de produit
- Header avec breadcrumb et menu utilisateur
- Zone de contenu principale adaptative
- Dashboard comme page d'accueil par défaut

## Architecture Cible

### Structure Visuelle
```
┌─────────────────┬────────────────────────────────────────┐
│     SIDEBAR     │              HEADER                    │
│                 ├────────────────────────────────────────┤
│  [Logo]         │                                        │
│  [Dropdown      │          MAIN CONTENT                  │
│   Produit]      │                                        │
│                 │                                        │
│  • Dashboard    │                                        │
│  • Pages        │                                        │
│  • Events       │                                        │
│  • Keys         │                                        │
│  • Values       │                                        │
│                 │                                        │
└─────────────────┴────────────────────────────────────────┘
```

### Composants Principaux
- **AppLayout** : Layout principal avec SidebarProvider
- **AppSidebar** : Navigation latérale avec sélecteur produit
- **AppHeader** : Header avec breadcrumb et menu utilisateur
- **Dashboard** : Nouvelle page d'accueil avec vue d'ensemble produit

## Plan d'Implémentation

### Phase 1 : Préparation et Installation

#### 1.1 Créer une nouvelle branche
```bash
git checkout -b feature/ui-saas-architecture
```

#### 1.2 Installer les composants shadcn/ui manquants
```bash
cd frontend
npx shadcn@latest add sidebar sheet avatar dropdown-menu breadcrumb
```

**Composants à installer :**
- `sidebar` : Navigation latérale principale
- `sheet` : Sidebar mobile responsive
- `avatar` : Avatar utilisateur
- `dropdown-menu` : Menus déroulants (produit, profil)
- `breadcrumb` : Navigation contextuelle

### Phase 2 : Context et État Global

#### 2.1 Créer ProductContext
**Fichier :** `frontend/src/contexts/ProductContext.tsx`

**Fonctionnalités :**
- Gestion du produit actuellement sélectionné
- Persistance dans localStorage
- Synchronisation avec les routes
- API pour charger la liste des produits

**Structure :**
```typescript
interface ProductContextType {
  currentProduct: Product | null
  products: Product[]
  setCurrentProduct: (product: Product) => void
  loadProducts: () => Promise<void>
  isLoading: boolean
}
```

#### 2.2 Hook personnalisé useProduct
**Fichier :** `frontend/src/hooks/useProduct.ts`

Simplifier l'accès au contexte produit dans les composants.

### Phase 3 : Composants Layout

#### 3.1 AppSidebar Component
**Fichier :** `frontend/src/components/layout/AppSidebar.tsx`

**Structure :**
```tsx
<Sidebar>
  <SidebarHeader>
    {/* Logo TrackMap */}
    {/* Dropdown sélection produit */}
  </SidebarHeader>
  
  <SidebarContent>
    <SidebarGroup>
      <SidebarMenu>
        {/* Items de navigation */}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  
  <SidebarFooter>
    {/* Informations version/utilisateur */}
  </SidebarFooter>
</Sidebar>
```

**Navigation Items :**
- 📊 Dashboard (route: `/products/:productName`)
- 📑 Pages (route: `/products/:productName/pages`)  
- ⚡ Events (route: `/products/:productName/events`)
- 🏷️ Propriétés (route: `/products/:productName/properties`)
- 💎 Valeurs suggérées (route: `/products/:productName/suggested-values`)

**Logique :**
- Dropdown produit avec recherche
- Navigation conditionnelle (désactivée si aucun produit sélectionné)
- Highlight de l'item actuel basé sur la route
- État collapsible pour mobile

#### 3.2 AppHeader Component
**Fichier :** `frontend/src/components/layout/AppHeader.tsx`

**Structure :**
```tsx
<header>
  <div>
    {/* Breadcrumb navigation */}
    <Breadcrumb />
  </div>
  
  <div>
    {/* Menu utilisateur (futur) */}
    <DropdownMenu>
      <Avatar />
    </DropdownMenu>
  </div>
</header>
```

**Breadcrumb Logic :**
- Produits > [Nom du produit]
- Produits > [Nom du produit] > Pages
- Produits > [Nom du produit] > Pages > [Nom de la page]
- etc.

#### 3.3 AppLayout Component
**Fichier :** `frontend/src/components/layout/AppLayout.tsx`

**Structure :**
```tsx
<ProductProvider>
  <SidebarProvider>
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
</ProductProvider>
```

### Phase 4 : Pages et Routes

#### 4.1 Nouvelle page Dashboard
**Fichier :** `frontend/src/pages/Dashboard.tsx`

**Contenu basé sur le zoning :**
- Header avec nom produit + métadonnées
- Stats cards (Pages, Events, Properties) + zone graphique
- Section Actions (gauche)
- Section Pages (droite)
- Sections "Event to test" et "Event activities"

**Réutilise :** Le contenu actuel de `ProductDetail.tsx` comme base

#### 4.2 Adapter les routes existantes
**Modifier :** `frontend/src/App.tsx`

**Nouvelles routes :**
```tsx
<Routes>
  <Route path="/" element={<ProductSelector />} />
  <Route path="/products/:productName" element={<Dashboard />} />
  <Route path="/products/:productName/pages" element={<PagesList />} />
  <Route path="/products/:productName/pages/:pageSlug" element={<PageDetail />} />
  <Route path="/products/:productName/events" element={<EventsList />} />
  <Route path="/products/:productName/properties" element={<PropertiesList />} />
  <Route path="/products/:productName/suggested-values" element={<SuggestedValuesList />} />
</Routes>
```

#### 4.3 Page de sélection de produit
**Fichier :** `frontend/src/pages/ProductSelector.tsx`

Page d'accueil quand aucun produit n'est sélectionné :
- Liste des produits disponibles
- Possibilité de créer un nouveau produit
- Redirection automatique vers le dashboard après sélection

### Phase 5 : Adaptations et Optimisations

#### 5.1 Mise à jour des composants existants
- Supprimer la logique de navigation des pages actuelles
- Adapter les BackLink pour utiliser le nouveau système
- Mettre à jour les modaux pour s'intégrer au nouveau layout

#### 5.2 Responsive Design
- Sidebar collapsible sur mobile (utiliser Sheet)
- Navigation mobile-first
- Gestion des états loading et erreurs

#### 5.3 Persistence et Performance
- Sauvegarder le produit sélectionné dans localStorage
- Lazy loading des données par section
- Cache intelligent des données produit

### Phase 6 : Tests et Validation

#### 6.1 Tests fonctionnels
- Navigation entre les sections
- Changement de produit
- Responsive design
- États loading/error

#### 6.2 Migration des données existantes
- Vérifier la compatibilité avec l'API existante
- Tester la navigation depuis les anciennes URLs
- Validation des redirections automatiques

## Impacts et Considérations

### Avantages
✅ **UX améliorée** : Navigation SaaS intuitive
✅ **Productivité** : Changement de produit sans perte de contexte  
✅ **Extensibilité** : Architecture préparée pour multi-utilisateur
✅ **Cohérence** : Composants shadcn/ui uniformes
✅ **Mobile-ready** : Responsive par design

### Points d'attention
⚠️ **Compatibilité** : Vérifier tous les liens existants
⚠️ **Performance** : Optimiser le chargement initial
⚠️ **État** : Bien gérer la synchronisation produit/route
⚠️ **Fallback** : Gérer les cas où aucun produit n'est disponible

## Fichiers à Créer

```
frontend/src/
├── contexts/
│   └── ProductContext.tsx
├── hooks/
│   └── useProduct.ts
├── components/layout/
│   ├── AppLayout.tsx
│   ├── AppSidebar.tsx
│   └── AppHeader.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── ProductSelector.tsx
│   └── EventsList.tsx (nouveau)
└── utils/
    └── navigation.ts
```

## Fichiers à Modifier

```
frontend/src/
├── App.tsx (routes principales)
├── pages/
│   ├── ProductDetail.tsx → Dashboard.tsx (migration contenu)
│   ├── ProductsList.tsx (simplification)
│   ├── PageDetail.tsx (adaptation navigation)
│   ├── PropertiesList.tsx (adaptation navigation)
│   └── SuggestedValuesList.tsx (adaptation navigation)
└── components/
    └── Layout.tsx (déprécié → AppLayout.tsx)
```

## Timeline Estimée

- **Phase 1-2** : 1 jour (setup + context)
- **Phase 3** : 2-3 jours (composants layout)
- **Phase 4** : 2 jours (pages + routes)
- **Phase 5-6** : 1-2 jours (optimisations + tests)

**Total estimé : 6-8 jours**

## Validation Final

Une fois l'implémentation terminée :
1. Tester tous les parcours utilisateur
2. Vérifier la cohérence visuelle
3. Valider les performances
4. Contrôler l'accessibilité
5. Tests cross-browser et responsive

---

*Cette stratégie maintient la logique métier existante tout en modernisant complètement l'interface utilisateur vers une architecture SaaS professionnelle.*