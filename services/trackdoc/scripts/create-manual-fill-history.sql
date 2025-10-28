-- Create EventDefinitionHistory entries for manual fill operations
-- Generated: 2025-10-28
-- Purpose: Track manual modifications of description and userInteractionType

-- =============================================================================
-- History entries for manual fill (description + userInteractionType)
-- =============================================================================

-- 1. select_content - description filled
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jq0005uy8ibzl61dtj',
  'description',
  '',
  'Sélection d''un élément de contenu (catégorie, tag, article relié, référence, lien). Cet événement GA4 standard tracke toute interaction de sélection de contenu sur la page Articles. Les propriétés contextuelles (section_name, element_category, element_name) permettent de différencier les types de sélection.',
  'manual',
  CURRENT_TIMESTAMP
);

-- 1. select_content - userInteractionType corrected
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jq0005uy8ibzl61dtj',
  'user_interaction_type',
  'interaction',
  'click',
  'manual',
  CURRENT_TIMESTAMP
);

-- 2. page_view - description filled
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jl0001uy8ioxk2zpxa',
  'description',
  '',
  'Chargement d''une page. Événement GA4 standard page_view déclenché automatiquement lors de la navigation. Les propriétés peuvent varier selon le type de page (Homepage générique vs Articles avec contexte complet).',
  'manual',
  CURRENT_TIMESTAMP
);

-- 2. page_view - userInteractionType corrected
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jl0001uy8ioxk2zpxa',
  'user_interaction_type',
  'interaction',
  'page_load',
  'manual',
  CURRENT_TIMESTAMP
);

-- 3. add_favorite - description filled
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jv000duy8iqhya35pm',
  'description',
  '',
  'Ajout d''un article aux favoris. Action utilisateur de bookmarking d''un contenu pour consultation ultérieure. Peut être déclenchée depuis la barre d''actions en bas d''article ou depuis les contenus reliés.',
  'manual',
  CURRENT_TIMESTAMP
);

-- 3. add_favorite - userInteractionType corrected
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jv000duy8iqhya35pm',
  'user_interaction_type',
  'interaction',
  'click',
  'manual',
  CURRENT_TIMESTAMP
);

-- 4. remove_favorite - description filled
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jx000huy8i08d1f1t9',
  'description',
  '',
  'Retrait d''un article des favoris. Action utilisateur de suppression d''un bookmark existant. Peut être déclenchée depuis la barre d''actions en bas d''article ou depuis les contenus reliés.',
  'manual',
  CURRENT_TIMESTAMP
);

-- 4. remove_favorite - userInteractionType corrected
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10jx000huy8i08d1f1t9',
  'user_interaction_type',
  'interaction',
  'click',
  'manual',
  CURRENT_TIMESTAMP
);

-- 5. like - description filled
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10js0009uy8i0vq44g9n',
  'description',
  '',
  'Action "J''aime" sur un article. Permet à l''utilisateur d''exprimer son appréciation d''un contenu. Disponible dans la barre d''actions en bas d''article.',
  'manual',
  CURRENT_TIMESTAMP
);

-- 5. like - userInteractionType corrected
INSERT INTO event_definition_history (id, event_definition_id, field, old_value, new_value, author, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'cmham10js0009uy8i0vq44g9n',
  'user_interaction_type',
  'interaction',
  'click',
  'manual',
  CURRENT_TIMESTAMP
);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Check that all history entries were created

SELECT
  ed.name as event_name,
  edh.field,
  edh.old_value,
  SUBSTR(edh.new_value, 1, 50) || '...' as new_value_preview,
  edh.author,
  edh.created_at
FROM event_definition_history edh
JOIN event_definitions ed ON edh.event_definition_id = ed.id
WHERE edh.author = 'manual'
ORDER BY ed.name, edh.field;

-- Expected: 10 rows (2 per EventDefinition: description + userInteractionType)
