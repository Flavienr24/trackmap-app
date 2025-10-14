# Bulk Event Import - Integration Notes

## Status: 80% Complete

### ✅ What's Done

**Infrastructure (Phase 0)**
- Backend endpoint `/api/products/:id/import-context` with pagination ✅
- React Query integration with caching ✅
- Types and API services ✅

**Parser System (Phase 1)**
- Modular architecture (<200 lines/file) ✅
- 4 parsers: JSON, CSV/Excel, Key-Value, Jira ✅
- Fuzzy matching with Levenshtein distance ✅
- Learning engine (localStorage, 500 entries, 30-day decay) ✅
- Context enricher (duplicate detection) ✅
- Test fixtures for all formats ✅

**Bulk Importer Component (Phase 2-3)**
- BulkEventImporter with multi-format support ✅
- Loading/error states with fallback mode ✅
- EditablePropertiesTable with inline editing ✅
- Status badges (NEW, EXISTS, SIMILAR, BOOSTED) ✅
- Suggestion application with learning ✅
- Summary of actions before validation ✅

**UI Components**
- Tabs component (Radix UI based) ✅
- All necessary subcomponents ✅

### 🔄 What Remains (Phase 4)

**CreateEventModal Integration**

To complete the integration, modify `frontend/src/components/organisms/CreateEventModal.tsx`:

1. **Add imports:**
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BulkEventImporter, type ParsedImportData } from '@/components/organisms/BulkEventImporter'
```

2. **Add state for tabs:**
```typescript
const [importMode, setImportMode] = useState<'manual' | 'bulk'>('manual')
const [hasManualData, setHasManualData] = useState(false)
```

3. **Wrap form content in Tabs:**
```typescript
<Tabs value={importMode} onValueChange={(v) => handleModeSwitch(v as 'manual' | 'bulk')}>
  <TabsList>
    <TabsTrigger value="manual">
      Ajout manuel
      {hasManualData && <span className="ml-2 text-xs">•</span>}
    </TabsTrigger>
    <TabsTrigger value="bulk">Import en lot</TabsTrigger>
  </TabsList>

  <TabsContent value="manual">
    {/* Existing form content */}
  </TabsContent>

  <TabsContent value="bulk">
    <BulkEventImporter
      productId={productId!}
      onValidated={handleBulkImportValidated}
      onCancel={() => setImportMode('manual')}
    />
  </TabsContent>
</Tabs>
```

4. **Add handlers:**
```typescript
const handleModeSwitch = (newMode: 'manual' | 'bulk') => {
  // Confirm if switching with unsaved data
  if (newMode === 'bulk' && hasManualData) {
    if (!confirm('Vous avez des données en cours. Continuer ?')) return
  }
  setImportMode(newMode)
}

const handleBulkImportValidated = (data: ParsedImportData) => {
  // Pre-fill manual form with imported data
  setFormData({
    name: data.eventName,
    status: 'to_implement',
    properties: data.properties
  })
  setImportMode('manual') // Switch to manual for review
}
```

5. **Track manual data changes:**
```typescript
useEffect(() => {
  setHasManualData(!!(formData.name || Object.keys(formData.properties || {}).length > 0))
}, [formData])
```

### 🧪 Testing

**Manual testing checklist:**
1. ✅ Parse JSON format
2. ✅ Parse Excel copy-paste (tab-separated)
3. ✅ Parse key:value format
4. ✅ Parse Jira markdown table
5. ✅ Test with accents (événement, achat_réussi)
6. ✅ Test with special characters
7. ✅ Test duplicate detection (existing event names)
8. ✅ Test similar matches (fuzzy matching)
9. ✅ Test learning engine (apply suggestion, verify boost on next use)
10. ✅ Test fallback mode (disconnect backend)
11. ⏳ Test tab switching with confirmation
12. ⏳ Test pre-fill from bulk import
13. ⏳ Test full flow: import → edit → submit

### 📊 Performance Metrics

- API calls reduced: 10+ → 1 (90% reduction)
- Payload size: < 100kb with pagination
- Cache duration: 5 minutes (React Query)
- Learning engine: 500 entries max, 30-day decay
- Parser modules: All < 200 lines

### 🎯 Key Features

**Smart Parsing**
- Auto-detects JSON, CSV, Excel, Jira formats
- Type inference (string/number/boolean)
- Handles accents and special characters

**Duplicate Detection**
- Exact match detection for events/properties/values
- Fuzzy matching with configurable thresholds (0.75 events, 0.80 properties)
- Visual badges: NEW (orange), EXISTS (green), SIMILAR (blue), BOOSTED (purple)

**Learning Engine**
- Records accepted suggestions in localStorage
- Provides score boost (0-0.2) for repeated patterns
- Automatic decay for old matches (30 days)
- Per-product and per-type learning

**UX**
- Inline editing for all properties
- One-click suggestion application
- Clear summary before validation
- Fallback mode if context unavailable

### 📝 Files Reference

**Core Components:**
- `BulkEventImporter.tsx` - Main import component
- `EditablePropertiesTable.tsx` - Editable properties with badges
- `useImportContext.ts` - React Query hook with cache

**Parser System:**
- `eventParser/index.ts` - Orchestrator
- `eventParser/parsers/` - 4 format parsers
- `eventParser/enrichment/` - Fuzzy matching + learning + context enrichment
- `eventParser/normalizers/` - String normalization

**Backend:**
- `productsController.ts:getImportContext` - Consolidated endpoint
- `importContext.schema.ts` - Zod validation schema

### 🚀 Next Steps

1. Complete CreateEventModal integration (30 min)
2. Manual testing with real Excel/Jira exports (1 hour)
3. Fix any edge cases discovered
4. User acceptance testing
5. Merge to master

---

**Commits:**
- `621e365` - Phase 0: Infrastructure
- `cce3d3d` - Phase 1: Parser system
- `96db164` - Phase 2: BulkEventImporter
- `5b29e16` - Phase 3: Editable preview

**Branch:** `feature/bulk-event-import`
