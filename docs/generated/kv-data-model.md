# KV data model

**Source of truth in code:** `src/lib/kv.js` (`KVManager`). Update this doc when key patterns change.

## Index keys

| Key | Value |
|-----|--------|
| `products:all` | JSON array of product IDs |
| `collections:all` | JSON array of collection IDs |
| `media:all` | JSON array of media IDs |

## Entity keys

| Pattern | Entity |
|---------|--------|
| `product:{id}` | Product document (includes `images[]`, optional `collectionId`, `archived`) |
| `collection:{id}` | Collection document |
| `collection:products:{collectionId}` | JSON array of product IDs in collection |
| `media:{id}` | Media metadata record |

## Product shape (typical)

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": 0,
  "images": ["url"],
  "collectionId": "optional-uuid",
  "archived": false,
  "variants": []
}
```

## Collection shape (typical)

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "heroImage": "url"
}
```

## Media shape

```json
{
  "id": "string",
  "url": "string",
  "source": "string",
  "filename": "string",
  "mimeType": "string",
  "driveFileId": "string",
  "createdAt": 0,
  "updatedAt": 0
}
```

## Settings and auth

Store settings and admin tokens may use additional keys via `src/services/StoreSettingsService.js` and auth middleware—grep `namespace.put` in `src/` when extending this doc.

**Generated:** manually curated (not auto-synced). Flag drift in [tech-debt-tracker.md](../exec-plans/tech-debt-tracker.md).
