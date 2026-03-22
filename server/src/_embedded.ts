// Static files are embedded here during binary builds (see scripts/build-binary.ts).
// In Docker / dev this file is not used — the server falls back to the file system.
export const files: Map<string, { b64: string; mime: string }> | null = null;
