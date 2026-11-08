# Migrating to IIBIN 2.0

**JavaScript 1.x and the IIBIN 2.0 schema API use different wire formats.**
Changing a package version or import does not convert existing payloads.
Python 2.0 and JavaScript 2.0 use schema-defined protobuf wire messages,
matching King's native schema codec. The 2.0 packages are alpha releases.

## Choose a migration path

- **Keep existing messages:** retain the matching JavaScript 1.x codec. In the
  2.0 npm package its exports are under `@intelligentintern/iibin/legacy`.
  Both `IIBINEncoder`/`IIBINDecoder` and `IIBinProtocol` remain there; they are
  different legacy codecs, so keep the one that originally wrote your data.
- **Use the shared schema format:** move every peer on a connection to an
  agreed schema. Decode stored old data with its original decoder, map its
  application values, then encode those values with `Schema`.

For existing imports:

```ts
// Old package-root import:
// import { IIBINEncoder, IIBINDecoder } from '@intelligentintern/iibin';
// Compatible legacy imports inside the 2.0 package:
import { IIBINEncoder, IIBINDecoder } from '@intelligentintern/iibin/legacy';
```

## Agree on the message schema

JavaScript:

```ts
import { Schema } from '@intelligentintern/iibin';
const greeting = new Schema({text: {id: 1, type: 'string'}});
const bytes = greeting.encode({text: 'Hallo'});
```

Python:

```python
from iibin import Schema
greeting = Schema({'text': {'id': 1, 'type': 'string'}})
wire = greeting.encode({'text': 'Hallo'})
```

PHP, with the updated native King extension loaded:

```php
King\IIBIN::defineSchema('Greeting', [
    'text' => ['tag' => 1, 'type' => 'string'],
]);
$wire = King\IIBIN::encode('Greeting', ['text' => 'Hallo']);
```

All three examples produce `0a0548616c6c6f`. Field IDs/tags and field types,
including nested and repeated fields, must agree. Preserve existing field IDs
when evolving a schema; do not reuse an ID for a different meaning or type.
Include any application message type, request ID or timestamp in your schema
or in an explicit outer transport contract.

## Roll out the format explicitly

Schema payloads do not embed a version header or schema identifier. Select
legacy versus schema format through endpoint negotiation or stored metadata.
Do not try decoders until one succeeds: unrelated legacy bytes may also be
valid protobuf fields. Deploy matching peers before changing what an existing
endpoint sends. Keep the old decoder while old stored data still exists.

King already uses protobuf wire encoding. Its accompanying native update
adds full-range `uint64`/`fixed64` handling and aligns UTF-8, finite-number
and field-tag validation; it does not add a new PHP payload header.
Rebuild and deploy that native extension separately. `pip install` and
`npm install` do not replace the PHP process's loaded `king.so`.

## Value and validation changes

| Wire value | Python | JavaScript | Updated King / PHP |
| --- | --- | --- | --- |
| 64-bit integer | `int` | `bigint` | `int`; unsigned values above `PHP_INT_MAX` use decimal strings |
| Raw bytes | `bytes` | `Uint8Array` | binary string |
| UTF-8 text | `str` | `string` | valid UTF-8 string |

Preserve large integers without converting through floating-point values.
The native King update accepts canonical unsigned decimal strings through
`18446744073709551615` for `uint64`/`fixed64` and returns strings above the PHP
integer range. Existing smaller unsigned values still decode as PHP integers.
Invalid UTF-8, non-finite floats, float32 overflow and invalid field tags are
rejected; callers relying on previously permissive King inputs must fix them.

Stay within the Python/JavaScript limits of 16 MiB per frame and nesting 32.
King's maps, oneof, enum registries, required/default fields and named recursive
schemas are extra PHP schema APIs not exposed by the Python/JavaScript APIs.

## Alpha 2 release note

`2.0.0-alpha.2` (npm) and `2.0.0a2` (PyPI) add prominent compatibility notices,
this migration guide and changelogs. Their codec implementation and wire bytes
are unchanged from alpha 1. The format break is relative to JavaScript 1.x;
Python's first PyPI release was `2.0.0a1`.
