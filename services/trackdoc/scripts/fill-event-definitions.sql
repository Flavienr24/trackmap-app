-- Manual Fill Script: EventDefinitions Descriptions & UserInteractionTypes
-- Generated: 2025-10-28
-- Migration: Pass 2 Back-fill completed
-- Purpose: Fill empty description and correct userInteractionType for all 5 EventDefinitions

-- IMPORTANT: This script should be run ONCE after Pass 2 backfill
-- Each UPDATE will create an EventDefinitionHistory entry via application triggers (if implemented)
-- or manually via companion script

-- =============================================================================
-- 1. select_content - 7 occurrences (HIGHEST PRIORITY)
-- =============================================================================
UPDATE event_definitions
SET
  description = 'Sélection d''un élément de contenu (catégorie, tag, article relié, référence, lien). Cet événement GA4 standard tracke toute interaction de sélection de contenu sur la page Articles. Les propriétés contextuelles (section_name, element_category, element_name) permettent de différencier les types de sélection.',
  user_interaction_type = 'click',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cmham10jq0005uy8ibzl61dtj'
  AND name = 'select_content';

-- =============================================================================
-- 2. page_view - 2 occurrences
-- =============================================================================
UPDATE event_definitions
SET
  description = 'Chargement d''une page. Événement GA4 standard page_view déclenché automatiquement lors de la navigation. Les propriétés peuvent varier selon le type de page (Homepage générique vs Articles avec contexte complet).',
  user_interaction_type = 'page_load',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cmham10jl0001uy8ioxk2zpxa'
  AND name = 'page_view';

-- =============================================================================
-- 3. add_favorite - 2 occurrences
-- =============================================================================
UPDATE event_definitions
SET
  description = 'Ajout d''un article aux favoris. Action utilisateur de bookmarking d''un contenu pour consultation ultérieure. Peut être déclenchée depuis la barre d''actions en bas d''article ou depuis les contenus reliés.',
  user_interaction_type = 'click',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cmham10jv000duy8iqhya35pm'
  AND name = 'add_favorite';

-- =============================================================================
-- 4. remove_favorite - 2 occurrences
-- =============================================================================
UPDATE event_definitions
SET
  description = 'Retrait d''un article des favoris. Action utilisateur de suppression d''un bookmark existant. Peut être déclenchée depuis la barre d''actions en bas d''article ou depuis les contenus reliés.',
  user_interaction_type = 'click',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cmham10jx000huy8i08d1f1t9'
  AND name = 'remove_favorite';

-- =============================================================================
-- 5. like - 1 occurrence
-- =============================================================================
UPDATE event_definitions
SET
  description = 'Action "J''aime" sur un article. Permet à l''utilisateur d''exprimer son appréciation d''un contenu. Disponible dans la barre d''actions en bas d''article.',
  user_interaction_type = 'click',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cmham10js0009uy8i0vq44g9n'
  AND name = 'like';

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this after executing the UPDATEs to verify all descriptions are filled

SELECT
  id,
  name,
  CASE
    WHEN description = '' THEN '❌ Vide'
    WHEN description IS NULL THEN '❌ NULL'
    ELSE '✅ Remplie'
  END as description_status,
  LENGTH(description) as description_length,
  user_interaction_type,
  (SELECT COUNT(*) FROM events WHERE event_definition_id = event_definitions.id) as occurrences,
  updated_at
FROM event_definitions
ORDER BY occurrences DESC;

-- Expected result: All rows with description_status = '✅ Remplie'
-- Expected userInteractionTypes:
--   - select_content: click
--   - page_view: page_load
--   - add_favorite: click
--   - remove_favorite: click
--   - like: click
