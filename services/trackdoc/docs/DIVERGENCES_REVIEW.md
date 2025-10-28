# Review Manuelle des Divergences - Pass 2

Document de review pour les 4 événements avec propriétés divergentes détectés lors de la migration Pass 1.

**Date**: 2025-10-28
**Migration**: 20251028142000_event_definitions_pass1
**Objectif**: Décider de la stratégie de consolidation pour chaque événement avant le back-fill Pass 2

---

## 📊 Vue d'Ensemble

- **4 événements** avec propriétés divergentes sur 5 au total (80%)
- **13 occurrences** concernées sur 14 au total (93%)
- **Divergences contextuelles attendues**: Toutes les variantes sont des différences de `section_name`, `element_category`, `element_name` selon le contexte d'utilisation

---

## 1. `select_content` - 7 Variantes

**Analyse**: Event GA4 standard pour tracker la sélection de contenu. Les 7 variantes correspondent à 7 contextes différents sur la page Articles.

### Variantes Détectées

| # | section_name | element_category | element_name | Context |
|---|--------------|------------------|--------------|---------|
| 1 | article_header | category_badge | category:$category_name | Badge catégorie en header |
| 2 | article_bottom | tag | tag:$tag_name | Tag en bas d'article |
| 3 | (manquant) | related_content | article_$related_article_title | Article relié |
| 4 | article_related_content | category_badge | category:$category_name | Badge catégorie dans related content |
| 5 | article_related_content | (manquant) | link:see_all | Lien "voir tout" |
| 6 | article_references_section | (manquant) | action:references_deploy | Déployer références |
| 7 | article_references_list | (manquant) | link:source_link | Lien source |

### Analyse des Propriétés Communes

**Propriétés présentes dans TOUTES les variantes**:
- `page_category`: "article"
- `page_name`: "$article_name" (ou "$article_title")
- `country`: "$country"
- `language`: "$language"
- `environment_type`: "$environment" (ou "$environment_type")
- `page_id`: "$page-id"
- `user_id`: "$user-id"
- `user_loggued`: "$user_loggued"
- `user_profession`: "$profession"
- `user_speciality`: "$specialty" (ou "$user_speciality")
- `user_preferences`: "$user_preferences"

**Propriétés variables (contextuelles)**:
- `section_name`: Varie selon la section de la page
- `element_category`: Présent uniquement pour badges/tags
- `element_name`: Identifie l'élément cliqué précisément

### ✅ Recommandation

**Consolidation**: Une seule EventDefinition `select_content`

**Justification**:
- Les 7 variantes représentent le MÊME événement GA4 (`select_content`)
- Les différences de propriétés sont **contextuelles** et attendues
- Le but de `select_content` est justement de tracker différents types de sélection
- Les propriétés communes (page, user, environment) sont identiques

**Champs EventDefinition**:
```typescript
{
  name: "select_content",
  description: "", // À compléter manuellement par l'équipe
  userInteractionType: "click" // Suggéré (toutes les sélections sont des clics)
}
```

**Notes pour l'équipe**:
- Description suggérée: "Sélection d'un élément de contenu (catégorie, tag, article relié, référence, etc.)"
- Les 7 Events restent liés à cette définition unique
- Les propriétés de chaque Event conservent leur contexte spécifique

---

## 2. `add_favorite` - 2 Variantes

**Analyse**: Action d'ajout aux favoris depuis 2 sections différentes.

### Variantes Détectées

| # | section_name | Différences notables |
|---|--------------|----------------------|
| 1 | article_bottom_bar | Inclut `article_author` |
| 2 | article_related_content | N'inclut pas `article_author` |

### Analyse

**Propriétés communes**:
- `element_name`: "action:bookmark" (identique)
- `page_category`: "article"
- Toutes les propriétés user/environment

**Différences**:
- `section_name`: `article_bottom_bar` vs `article_related_content`
- `article_author`: Présent uniquement dans variante 1
- `page_name`: "$article_title" vs "$article_name" (probablement équivalent)

### ✅ Recommandation

**Consolidation**: Une seule EventDefinition `add_favorite`

**Justification**:
- Même action métier (bookmark/favoris)
- Même `element_name` (action:bookmark)
- Différence de section est contextuelle
- Absence de `article_author` dans variante 2 peut être une omission corrigible

**Champs EventDefinition**:
```typescript
{
  name: "add_favorite",
  description: "", // À compléter
  userInteractionType: "click" // Suggéré
}
```

**Action requise**:
- ⚠️ Vérifier si `article_author` devrait être ajouté à la variante 2 pour homogénéité
- Documenter que cet event peut être déclenché depuis 2 sections

---

## 3. `page_view` - 2 Variantes

**Analyse**: Page view sur Homepage (vide) et Articles (avec contexte).

### Variantes Détectées

| # | Page | Propriétés |
|---|------|-----------|
| 1 | Homepage | `{}` (vide) |
| 2 | Articles | Propriétés complètes (page_category, user, environment, etc.) |

### Analyse

**Différence majeure**:
- Homepage: Aucune propriété
- Articles: 11 propriétés (page_category, page_name, country, user data, etc.)

**Status**:
- Homepage: VALIDATED ✅
- Articles: TO_IMPLEMENT 🔨

### ⚠️ Recommandation

**Consolidation**: Une seule EventDefinition `page_view` (mais investigation requise)

**Justification**:
- Même événement GA4 standard (`page_view`)
- La différence est probablement due à une évolution du plan de tracking
- Homepage validé sans propriétés ≠ Articles avec propriétés complètes

**Champs EventDefinition**:
```typescript
{
  name: "page_view",
  description: "", // À compléter
  userInteractionType: "page_load" // Standard pour page_view
}
```

**⚠️ Actions requises**:
1. Vérifier si Homepage devrait avoir les mêmes propriétés qu'Articles
2. Décider si propriétés vides sur Homepage est intentionnel (page générique) ou incomplet
3. Potentiellement mettre à jour Homepage pour homogénéité

---

## 4. `remove_favorite` - 2 Variantes

**Analyse**: Action de retrait des favoris depuis 2 sections (identique à `add_favorite`).

### Variantes Détectées

| # | section_name | Différences notables |
|---|--------------|----------------------|
| 1 | article_bottom_bar | Inclut `article_author` |
| 2 | article_related_content | N'inclut pas `article_author` |

### Analyse

**Pattern identique à `add_favorite`**:
- Mêmes sections (`article_bottom_bar` vs `article_related_content`)
- Même différence (`article_author` présent/absent)
- Même `element_name` (action:bookmark)

### ✅ Recommandation

**Consolidation**: Une seule EventDefinition `remove_favorite`

**Justification**: Identique à `add_favorite` (même pattern, même contexte)

**Champs EventDefinition**:
```typescript
{
  name: "remove_favorite",
  description: "", // À compléter
  userInteractionType: "click" // Suggéré
}
```

**Action requise**:
- ⚠️ Même vérification que pour `add_favorite`: homogénéiser `article_author`

---

## 📋 Plan d'Action Pass 2

### Décisions de Consolidation

| Event Name | Variantes | EventDefinitions à créer | Action requise |
|------------|-----------|--------------------------|----------------|
| `select_content` | 7 | 1 | ✅ Aucune - divergences attendues |
| `add_favorite` | 2 | 1 | ⚠️ Vérifier `article_author` |
| `page_view` | 2 | 1 | ⚠️ Investiguer Homepage vide |
| `remove_favorite` | 2 | 1 | ⚠️ Vérifier `article_author` |
| `like` | 1 | 1 | ✅ Aucune - homogène |

**Total**: 5 EventDefinitions (comme prévu)

### Back-fill Strategy

Pour chaque EventDefinition:

1. **Créer l'EventDefinition** avec:
   - `name`: Nom de l'event
   - `description`: Vide (à compléter manuellement)
   - `userInteractionType`: Suggestion basée sur le tableau ci-dessous

2. **Lier tous les Events** de cette catégorie via `event_definition_id`

3. **Créer entrée d'historique** initiale avec champ "auto-backfill"

### Suggestions `userInteractionType`

| Event Name | Suggestion | Justification |
|------------|-----------|---------------|
| `select_content` | `click` | Sélection interactive |
| `add_favorite` | `click` | Action bouton |
| `page_view` | `page_load` | Standard GA4 |
| `remove_favorite` | `click` | Action bouton |
| `like` | `click` | Action bouton |

---

## ✅ Validation

**Review par**: _À compléter_
**Date de validation**: _À compléter_
**Décision finale**:
- [ ] Valider consolidation 5 EventDefinitions
- [ ] Corriger divergences `article_author` avant back-fill
- [ ] Investiguer `page_view` Homepage avant back-fill
- [ ] Procéder au back-fill tel quel

**Commentaires**:
_Espace pour notes de review_

---

## 📎 Références

- Log complet: `services/trackdoc/logs/migration-pass1-log-2025-10-28T13-06-50.json`
- Résumé: `services/trackdoc/logs/migration-pass1-summary-2025-10-28T13-06-50.txt`
- Verification: `services/trackdoc/logs/migration-pass1-verification-2025-10-28T13-05-50.json`
