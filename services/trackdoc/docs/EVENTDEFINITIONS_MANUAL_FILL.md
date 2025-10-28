# Guide de Remplissage Manuel - EventDefinitions

**Date**: 2025-10-28
**Migration**: Pass 2 Back-fill complété avec succès
**Objectif**: Remplir les champs `description` et `userInteractionType` pour les 5 EventDefinitions créées

---

## 📊 Vue d'Ensemble

**5 EventDefinitions créées** lors du back-fill Pass 2 :

| Event Name | Occurrences | Description | userInteractionType | Priorité |
|------------|-------------|-------------|---------------------|----------|
| `select_content` | 7 | ❌ Vide | ⚠️ "interaction" (défaut) | 🔴 Haute |
| `page_view` | 2 | ❌ Vide | ⚠️ "interaction" (défaut) | 🟡 Moyenne |
| `add_favorite` | 2 | ❌ Vide | ⚠️ "interaction" (défaut) | 🟡 Moyenne |
| `remove_favorite` | 2 | ❌ Vide | ⚠️ "interaction" (défaut) | 🟡 Moyenne |
| `like` | 1 | ❌ Vide | ⚠️ "interaction" (défaut) | 🟢 Basse |

**Priorisation** : Par nombre d'occurrences (impact)

---

## 1. `select_content` - 7 occurrences 🔴

**ID**: `cmham10jq0005uy8ibzl61dtj`
**Statut**: Description vide + userInteractionType à corriger

### Analyse (basée sur DIVERGENCES_REVIEW.md)

**Contextes d'utilisation** :
1. Badge catégorie en header
2. Tag en bas d'article
3. Article relié (related content)
4. Badge catégorie dans related content
5. Lien "voir tout"
6. Déployer références
7. Lien source

**Propriétés communes** :
- `page_category`: "article"
- User properties (id, profession, specialty, preferences)
- Environment properties (country, language, environment_type)

**Propriétés variables** (contextuelles) :
- `section_name`: Varie selon la section
- `element_category`: Présent pour badges/tags
- `element_name`: Identifie l'élément cliqué

### ✅ Recommandations

**Description suggérée** :
```
Sélection d'un élément de contenu (catégorie, tag, article relié, référence, lien).
Cet événement GA4 standard tracke toute interaction de sélection de contenu sur la page Articles.
Les propriétés contextuelles (section_name, element_category, element_name) permettent de différencier
les types de sélection.
```

**userInteractionType recommandé** : `click`
**Justification** : Toutes les variantes sont des clics sur des éléments interactifs

---

## 2. `page_view` - 2 occurrences 🟡

**ID**: `cmham10jl0001uy8ioxk2zpxa`
**Statut**: Description vide + userInteractionType à corriger

### Analyse

**Contextes d'utilisation** :
1. Homepage - Propriétés vides `{}`
2. Articles - Propriétés complètes (11 propriétés)

### ⚠️ Point d'attention

**Divergence identifiée** (voir DIVERGENCES_REVIEW.md) :
- Homepage a des propriétés vides
- Articles a des propriétés complètes

**Question à investiguer** : Les propriétés vides sur Homepage sont-elles intentionnelles (page générique) ou incomplètes ?

### ✅ Recommandations

**Description suggérée** :
```
Chargement d'une page. Événement GA4 standard 'page_view' déclenché automatiquement
lors de la navigation. Les propriétés peuvent varier selon le type de page
(Homepage générique vs Articles avec contexte complet).
```

**userInteractionType recommandé** : `page_load`
**Justification** : Standard GA4 pour les événements de type page_view

**Action requise** :
- [ ] Vérifier si Homepage devrait avoir les mêmes propriétés qu'Articles
- [ ] Décider si propriétés vides sont intentionnelles ou à corriger

---

## 3. `add_favorite` - 2 occurrences 🟡

**ID**: `cmham10jv000duy8iqhya35pm`
**Statut**: Description vide + userInteractionType à corriger

### Analyse

**Contextes d'utilisation** :
1. `article_bottom_bar` - Inclut `article_author`
2. `article_related_content` - N'inclut pas `article_author`

**Element commun** : `element_name: "action:bookmark"`

### ⚠️ Point d'attention

**Divergence identifiée** (voir DIVERGENCES_REVIEW.md) :
- Variante 1 inclut `article_author`
- Variante 2 ne l'inclut pas

**Question** : `article_author` devrait-il être présent dans les deux variantes pour homogénéité ?

### ✅ Recommandations

**Description suggérée** :
```
Ajout d'un article aux favoris. Action utilisateur de bookmarking d'un contenu
pour consultation ultérieure. Peut être déclenchée depuis la barre d'actions
en bas d'article ou depuis les contenus reliés.
```

**userInteractionType recommandé** : `click`
**Justification** : Action bouton/icône bookmark

**Action requise** :
- [ ] Vérifier si `article_author` devrait être ajouté à la variante 2

---

## 4. `remove_favorite` - 2 occurrences 🟡

**ID**: `cmham10jx000huy8i08d1f1t9`
**Statut**: Description vide + userInteractionType à corriger

### Analyse

**Contextes d'utilisation** :
1. `article_bottom_bar` - Inclut `article_author`
2. `article_related_content` - N'inclut pas `article_author`

**Element commun** : `element_name: "action:bookmark"`

### ⚠️ Point d'attention

**Même pattern que `add_favorite`** :
- Variante 1 inclut `article_author`
- Variante 2 ne l'inclut pas

### ✅ Recommandations

**Description suggérée** :
```
Retrait d'un article des favoris. Action utilisateur de suppression d'un bookmark
existant. Peut être déclenchée depuis la barre d'actions en bas d'article ou
depuis les contenus reliés.
```

**userInteractionType recommandé** : `click`
**Justification** : Action bouton/icône bookmark

**Action requise** :
- [ ] Vérifier si `article_author` devrait être ajouté à la variante 2 (même correction que `add_favorite`)

---

## 5. `like` - 1 occurrence 🟢

**ID**: `cmham10js0009uy8i0vq44g9n`
**Statut**: Description vide + userInteractionType à corriger

### Analyse

**Contexte unique** :
- Section : `article_bottom_bar`
- Element : `action:like`
- Propriétés homogènes (aucune divergence)

### ✅ Recommandations

**Description suggérée** :
```
Action "J'aime" sur un article. Permet à l'utilisateur d'exprimer son appréciation
d'un contenu. Disponible dans la barre d'actions en bas d'article.
```

**userInteractionType recommandé** : `click`
**Justification** : Action bouton like

---

## 🔧 Comment Remplir Manuellement

### Option A : Via SQL (Rapide)

```sql
-- 1. select_content
UPDATE event_definitions
SET description = 'Sélection d''un élément de contenu (catégorie, tag, article relié, référence, lien). Cet événement GA4 standard tracke toute interaction de sélection de contenu sur la page Articles.',
    user_interaction_type = 'click'
WHERE id = 'cmham10jq0005uy8ibzl61dtj';

-- 2. page_view
UPDATE event_definitions
SET description = 'Chargement d''une page. Événement GA4 standard page_view déclenché automatiquement lors de la navigation.',
    user_interaction_type = 'page_load'
WHERE id = 'cmham10jl0001uy8ioxk2zpxa';

-- 3. add_favorite
UPDATE event_definitions
SET description = 'Ajout d''un article aux favoris. Action utilisateur de bookmarking d''un contenu pour consultation ultérieure.',
    user_interaction_type = 'click'
WHERE id = 'cmham10jv000duy8iqhya35pm';

-- 4. remove_favorite
UPDATE event_definitions
SET description = 'Retrait d''un article des favoris. Action utilisateur de suppression d''un bookmark existant.',
    user_interaction_type = 'click'
WHERE id = 'cmham10jx000huy8i08d1f1t9';

-- 5. like
UPDATE event_definitions
SET description = 'Action "J''aime" sur un article. Permet à l''utilisateur d''exprimer son appréciation d''un contenu.',
    user_interaction_type = 'click'
WHERE id = 'cmham10js0009uy8i0vq44g9n';
```

### Option B : Via API (Futur - Phase Backend)

Une fois le backend implémenté (Phase 2 de la roadmap), utiliser :
```
PUT /api/event-definitions/:id
{
  "description": "...",
  "userInteractionType": "click"
}
```

### Option C : Via UI Admin (Futur - Phase Frontend)

Une fois l'interface créée (Phase 6 de la roadmap), édition directe via EventDetail page.

---

## ✅ Checklist de Remplissage

- [ ] **select_content** : Description + userInteractionType = "click"
- [ ] **page_view** : Description + userInteractionType = "page_load"
- [ ] **add_favorite** : Description + userInteractionType = "click"
- [ ] **remove_favorite** : Description + userInteractionType = "click"
- [ ] **like** : Description + userInteractionType = "click"

**Actions de validation** :
- [ ] Investiguer divergence `page_view` Homepage (propriétés vides)
- [ ] Corriger `article_author` manquant (add_favorite / remove_favorite variante 2)

**Après remplissage** :
- [ ] Vérifier avec requête SQL que tous les champs sont remplis
- [ ] Créer entrée EventDefinitionHistory pour tracer les modifications manuelles
- [ ] Commit des changements en base de données

---

## 📊 Requête de Vérification Post-Remplissage

```sql
-- Vérifier que toutes les descriptions sont remplies
SELECT
  id,
  name,
  CASE
    WHEN description = '' THEN '❌ Vide'
    ELSE '✅ Remplie'
  END as description_status,
  user_interaction_type,
  (SELECT COUNT(*) FROM events WHERE event_definition_id = event_definitions.id) as occurrences
FROM event_definitions
ORDER BY occurrences DESC;
```

**Résultat attendu** : Toutes les lignes avec `description_status = '✅ Remplie'`

---

**Fin du Guide**

Ce document servira de référence pour le remplissage manuel des EventDefinitions créées lors du Pass 2.
