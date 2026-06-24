// Runtime polyfill for File/Blob (used by UploadPhotoBody zod schema via zod.instanceof(File))
// Must be imported before the generated schemas are evaluated.
import "./polyfill";

// Re-export all Zod schemas (runtime validation + type inference)
export * from "./generated/api";

// For explicit TypeScript types, import directly from:
//   @workspace/api-zod/generated/types
// or use zod.infer<typeof SchemaName> from the Zod schemas above.
// export * from './generated/types';
