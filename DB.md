# DB.md — Atlas Search Strategy & Mapping Recommendations

> **Documentation only.** No source code, APIs, or indexes are created here.

---

## 1. Multi-Tenant Isolation

Every collection that belongs to a restaurant carries `restaurantId` (ObjectId). Outlet-scoped collections additionally carry `outletId`.

| Boundary | Field | Present in |
|---|---|---|
| Primary (tenant) | `restaurantId` | MenuItem, Category, Order, Outlet, User, InventoryItem |
| Secondary (outlet) | `outletId` | MenuItem, Category, Order, User, InventoryItem |

**Rules**
- Every Atlas Search query **must** include a `filter` clause on `restaurantId` before any text clause runs. Without this, cross-tenant data leaks.
- When a request is outlet-scoped, add a second `filter` on `outletId`.
- The `Restaurant` collection has no `restaurantId`; it is the root tenant document and is only queried by `SUPER_ADMIN` or internally.

---

## 2. Atlas Search Field Mapping (per collection)

### `menuitems`

| Field | Type | Atlas Search mapping |
|---|---|---|
| `restaurantId` | ObjectId | `objectId` (filter only) |
| `outletId` | ObjectId | `objectId` (filter only) |
| `categoryId` | ObjectId | `objectId` (filter only) |
| `name` | String | `autocomplete` + `string` |
| `description` | String | `string` |
| `price` | Number | `number` |
| `foodType` | String (enum) | `string` |
| `isAvailable` | Boolean | `boolean` |
| `isDeleted` | Boolean | `boolean` |
| `variants.name` | String | `string` |
| `addons.name` | String | `string` |

### `categories`

| Field | Type | Atlas Search mapping |
|---|---|---|
| `restaurantId` | ObjectId | `objectId` (filter only) |
| `outletId` | ObjectId | `objectId` (filter only) |
| `name` | String | `autocomplete` + `string` |
| `isActive` | Boolean | `boolean` |
| `isDeleted` | Boolean | `boolean` |

### `orders`

| Field | Type | Atlas Search mapping |
|---|---|---|
| `restaurantId` | ObjectId | `objectId` (filter only) |
| `outletId` | ObjectId | `objectId` (filter only) |
| `orderNumber` | Number | `number` |
| `customerName` | String | `string` |
| `customerPhone` | String | `string` |
| `status` | String (enum) | `string` |
| `paymentStatus` | String (enum) | `string` |
| `items.name` | String | `string` |
| `isDeleted` | Boolean | `boolean` |

### `inventoryitems`

| Field | Type | Atlas Search mapping |
|---|---|---|
| `restaurantId` | ObjectId | `objectId` (filter only) |
| `outletId` | ObjectId | `objectId` (filter only) |
| `name` | String | `autocomplete` + `string` |
| `unit` | String | `string` |
| `supplier.name` | String | `string` |
| `isDeleted` | Boolean | `boolean` |

### `users`

| Field | Type | Atlas Search mapping |
|---|---|---|
| `restaurantId` | ObjectId | `objectId` (filter only) |
| `outletId` | ObjectId | `objectId` (filter only) |
| `name` | String | `string` |
| `email` | String | `string` |
| `role` | String (enum) | `string` |
| `isDeleted` | Boolean | `boolean` |

### `restaurants` (SUPER_ADMIN only)

| Field | Type | Atlas Search mapping |
|---|---|---|
| `name` | String | `autocomplete` + `string` |
| `code` | String | `string` |
| `email` | String | `string` |
| `status` | String (enum) | `string` |
| `isDeleted` | Boolean | `boolean` |

---

## 3. Recommended Atlas Search Index Definitions

### Index: `menu_search` on `menuitems`

```json
{
  "name": "menu_search",
  "collectionName": "menuitems",
  "database": "<your-db>",
  "mappings": {
    "dynamic": false,
    "fields": {
      "restaurantId": { "type": "objectId" },
      "outletId":     { "type": "objectId" },
      "categoryId":   { "type": "objectId" },
      "isAvailable":  { "type": "boolean" },
      "isDeleted":    { "type": "boolean" },
      "foodType":     { "type": "string", "analyzer": "lucene.keyword" },
      "price":        { "type": "number" },
      "name": [
        { "type": "string",       "analyzer": "lucene.standard" },
        { "type": "autocomplete", "analyzer": "lucene.standard", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15 }
      ],
      "description": { "type": "string", "analyzer": "lucene.standard" },
      "variants": {
        "type": "embeddedDocuments",
        "fields": { "name": { "type": "string", "analyzer": "lucene.standard" } }
      },
      "addons": {
        "type": "embeddedDocuments",
        "fields": { "name": { "type": "string", "analyzer": "lucene.standard" } }
      }
    }
  }
}
```

### Index: `category_search` on `categories`

```json
{
  "name": "category_search",
  "collectionName": "categories",
  "database": "<your-db>",
  "mappings": {
    "dynamic": false,
    "fields": {
      "restaurantId": { "type": "objectId" },
      "outletId":     { "type": "objectId" },
      "isActive":     { "type": "boolean" },
      "isDeleted":    { "type": "boolean" },
      "name": [
        { "type": "string",       "analyzer": "lucene.standard" },
        { "type": "autocomplete", "analyzer": "lucene.standard", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15 }
      ]
    }
  }
}
```

### Index: `inventory_search` on `inventoryitems`

```json
{
  "name": "inventory_search",
  "collectionName": "inventoryitems",
  "database": "<your-db>",
  "mappings": {
    "dynamic": false,
    "fields": {
      "restaurantId": { "type": "objectId" },
      "outletId":     { "type": "objectId" },
      "isDeleted":    { "type": "boolean" },
      "unit":         { "type": "string", "analyzer": "lucene.keyword" },
      "name": [
        { "type": "string",       "analyzer": "lucene.standard" },
        { "type": "autocomplete", "analyzer": "lucene.standard", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15 }
      ],
      "supplier": {
        "type": "embeddedDocuments",
        "fields": { "name": { "type": "string", "analyzer": "lucene.standard" } }
      }
    }
  }
}
```

---

## 4. Performance Strategy

### Isolation at every scale

Every Atlas Search query must open with a `filter` compound clause that pins to `restaurantId`. Atlas Search evaluates `filter` before scoring text, so tenant isolation is enforced before any search work begins.

```
compound
  └─ filter  →  { restaurantId: <current tenant> }   ← always first
  └─ filter  →  { outletId: <outlet> }               ← when outlet-scoped
  └─ must / should → text / autocomplete clauses
```

| Scale | Strategy |
|---|---|
| **100 restaurants** | Single Atlas cluster, one index per searchable collection. `restaurantId` filter keeps query cardinality low. |
| **1 000 restaurants** | Add `outletId` to all compound filters where applicable. Consider separate Atlas Search indexes per high-volume tenant if one restaurant generates disproportionate document volume. |
| **10 000 restaurants** | Shard the MongoDB cluster on `{ restaurantId: 1, _id: 1 }`. Atlas Search indexes are shard-aware and route queries to the correct shard automatically, preserving isolation and reducing per-query scan size. Consider per-tier Atlas clusters (BASIC plan tenants on a shared cluster, PREMIUM on dedicated). |

---

## 5. Future Search Features

| Feature | Collection | Approach |
|---|---|---|
| Item name search | `menuitems` | `text` clause on `name`, analyzer `lucene.standard` |
| Category search | `categories` | `text` clause on `name` |
| Description search | `menuitems` | `text` clause on `description`, `lucene.standard` |
| Autocomplete | `menuitems`, `categories`, `inventoryitems` | `autocomplete` clause on `name` field (edgeGram, minGrams: 2) |
| Fuzzy search | `menuitems` | `text` clause with `fuzzy: { maxEdits: 1 }` on `name` |
| Outlet-scoped search | all collections with `outletId` | Add `filter: { outletId }` as second compound filter before text clauses |

All features must keep `restaurantId` as the first `filter` entry regardless of which additional feature is in use.
