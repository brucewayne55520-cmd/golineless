/**
 * Global type declarations for Blob and File.
 * Required because orval generates:
 *   - `zod.instanceof(File)` — needs `File` as a constructor value
 *   - `type UploadPhotoBody = { photo: Blob }` — needs `Blob` as a type
 *
 * The project uses `"lib": ["es2022"]` (no DOM types), so these must be declared.
 * Using `interface` for the type namespace and `declare class` for the value namespace
 * keeps them properly separate — no circular self-references.
 */
interface Blob {}
declare class File {}
