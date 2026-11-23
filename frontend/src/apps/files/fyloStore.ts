import { extractExtension, resolveFileExtension } from './fileExtensions';

export type FyloFileOwner = 'player' | 'system' | 'institutional';
export type FyloFileOrigin = 'fylo' | 'auremail' | 'versenet' | 'document-studio' | 'assignment' | 'system';

export interface FyloFile {
  id: string;
  name: string;
  type: string;
  dir: string;
  size: string;
  desc: string;
  body?: string;
  imageUrl?: string;
  document?: any;
  owner: FyloFileOwner;
  protected?: boolean;
  origin: FyloFileOrigin;
  publisher?: string;
  mailId?: string;
  webUrl?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  trashedAt?: string | null;
  previousDir?: string;
}

export interface FyloState {
  files: Record<string, FyloFile>;
  folders: string[];
  favorites: string[];
}

export const FYLO_TRASH_DIR = '/trash';
export const FYLO_NOTES_DIR = '/notes';
export const FYLO_MAIL_DOWNLOADS_DIR = '/downloads/auremail';

export function emptyFyloState(): FyloState {
  return { files: {}, folders: [], favorites: [] };
}

export function formatFileSize(text: string): string {
  const bytes = new TextEncoder().encode(text || '').length;
  if (bytes < 1024) return `${Math.max(bytes, 1)} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function sanitizeFyloDir(dir: unknown, fallback = FYLO_NOTES_DIR): string {
  if (typeof dir !== 'string') return fallback;
  const clean = '/' + dir.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\s+/g, '-').toLowerCase();
  if (!clean || clean === '/' || clean.includes('..') || clean === FYLO_TRASH_DIR) return fallback;
  return clean;
}

export function restoreFyloState(raw: unknown): FyloState {
  const files: Record<string, FyloFile> = {};
  const parsed = raw as Partial<FyloState> | null;
  const source = parsed?.files;
  if (source && typeof source === 'object') {
    for (const [key, item] of Object.entries(source)) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<FyloFile>;
      const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : key;
      const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : '';
      if (!id || !name) continue;
      const type = extractExtension(name);
      const trashedAt = typeof candidate.trashedAt === 'string' && candidate.trashedAt ? candidate.trashedAt : null;
      const dir = trashedAt ? FYLO_TRASH_DIR : sanitizeFyloDir(candidate.dir, FYLO_NOTES_DIR);
      const owner: FyloFileOwner =
        candidate.owner === 'system' || candidate.owner === 'institutional' ? candidate.owner : 'player';
      const origin: FyloFileOrigin =
        candidate.origin === 'auremail' ||
        candidate.origin === 'versenet' ||
        candidate.origin === 'document-studio' ||
        candidate.origin === 'assignment' ||
        candidate.origin === 'system'
          ? candidate.origin
          : 'fylo';
      files[id] = {
        id,
        name,
        type,
        dir,
        size: typeof candidate.size === 'string' && candidate.size.trim() ? candidate.size : formatFileSize(candidate.body || ''),
        desc: typeof candidate.desc === 'string' ? candidate.desc : resolveFileExtension(name).purpose,
        body: typeof candidate.body === 'string' ? candidate.body : undefined,
        imageUrl: typeof candidate.imageUrl === 'string' ? candidate.imageUrl : undefined,
        document: candidate.document && typeof candidate.document === 'object' ? candidate.document : undefined,
        owner,
        protected: Boolean(candidate.protected),
        origin,
        publisher: typeof candidate.publisher === 'string' ? candidate.publisher : undefined,
        mailId: typeof candidate.mailId === 'string' ? candidate.mailId : undefined,
        webUrl: typeof candidate.webUrl === 'string' ? candidate.webUrl : undefined,
        version: typeof candidate.version === 'string' ? candidate.version : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
        trashedAt,
        previousDir: typeof candidate.previousDir === 'string' ? sanitizeFyloDir(candidate.previousDir, FYLO_NOTES_DIR) : undefined,
      };
    }
  }
  const folders = Array.isArray(parsed?.folders)
    ? [...new Set(parsed!.folders.filter(f => typeof f === 'string' && f.trim()).map(f => sanitizeFyloDir(f, ''))).values()].filter(Boolean)
    : [];
  const favorites = Array.isArray(parsed?.favorites)
    ? [...new Set(parsed!.favorites.filter(f => typeof f === 'string' && f.trim()))]
    : [];
  return { files, folders, favorites };
}

export function canEditInFylo(file: { owner?: FyloFileOwner; protected?: boolean; name?: string; type?: string }): boolean {
  if (file.owner !== 'player' || file.protected) return false;
  const spec = resolveFileExtension(file.name || file.type || '');
  return Boolean(spec.editableInFylo);
}

export function canManageInFylo(file: { owner?: FyloFileOwner; protected?: boolean }): boolean {
  return file.owner === 'player' && !file.protected;
}

export const canTrashInFylo = canManageInFylo;

export function createFyloFolder(
  state: FyloState,
  name: string,
  parentDir = '',
): { state: FyloState; dir?: string; ok: boolean; reason?: string } {
  const cleanName = (name || '').trim().replace(/[\\/]+/g, '').replace(/\s+/g, '-').toLowerCase();
  if (!cleanName) return { state, ok: false, reason: 'Enter a folder name.' };
  const base = parentDir && parentDir !== '/home' && parentDir !== FYLO_TRASH_DIR ? sanitizeFyloDir(parentDir, '') : '';
  const dir = sanitizeFyloDir(`${base}/${cleanName}`, '');
  if (!dir) return { state, ok: false, reason: 'Invalid folder name.' };
  if (state.folders.includes(dir)) return { state, dir, ok: false, reason: 'That folder already exists.' };
  return { state: { ...state, folders: [...state.folders, dir] }, dir, ok: true };
}

export function createPersonalNote(
  state: FyloState,
  input: { name: string; body: string; desc?: string; dir?: string; ext?: 'note' | 'txt' },
): { state: FyloState; file?: FyloFile; ok: boolean; reason?: string } {
  const rawName = (input.name || '').trim();
  if (!rawName) return { state, ok: false, reason: 'Enter a filename for your note.' };
  const ext = rawName.includes('.') ? extractExtension(rawName) : input.ext || 'note';
  if (ext !== 'note' && ext !== 'txt') {
    return { state, ok: false, reason: 'Fylo creates .note and .txt files. Use a compatible application for other formats.' };
  }
  const finalName = rawName.includes('.') ? rawName : `${rawName}.${ext}`;
  const now = new Date().toISOString();
  const id = `fylo-note-${crypto.randomUUID()}`;
  const file: FyloFile = {
    id,
    name: finalName,
    type: ext,
    dir: sanitizeFyloDir(input.dir, FYLO_NOTES_DIR),
    size: formatFileSize(input.body || ''),
    desc: (input.desc || '').trim() || (ext === 'note' ? 'Personal Fylo note' : 'Plain-text note'),
    body: input.body || '',
    owner: 'player',
    protected: false,
    origin: 'fylo',
    version: 'v1.0',
    createdAt: now,
    updatedAt: now,
    trashedAt: null,
  };
  return { state: { ...state, files: { ...state.files, [id]: file } }, file, ok: true };
}

export function updateFyloNote(
  state: FyloState,
  id: string,
  patch: { name?: string; body?: string; desc?: string },
): { state: FyloState; file?: FyloFile; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing) return { state, ok: false, reason: 'File not found in Fylo.' };
  if (existing.trashedAt) return { state, ok: false, reason: 'Restore this file from Trash before editing.' };
  if (!canEditInFylo(existing)) {
    return { state, ok: false, reason: 'Fylo cannot edit protected files or non-note formats.' };
  }
  const nextBody = patch.body !== undefined ? patch.body : existing.body || '';
  let nextName = existing.name;
  if (patch.name !== undefined && patch.name.trim()) {
    const trimmed = patch.name.trim();
    nextName = trimmed.includes('.') ? trimmed : `${trimmed}.${existing.type}`;
    if (extractExtension(nextName) !== existing.type) {
      return { state, ok: false, reason: `Retain the original .${existing.type} file extension.` };
    }
  }
  const updated: FyloFile = {
    ...existing,
    name: nextName,
    body: nextBody,
    desc: patch.desc !== undefined ? patch.desc : existing.desc,
    size: formatFileSize(nextBody),
    updatedAt: new Date().toISOString(),
  };
  return { state: { ...state, files: { ...state.files, [id]: updated } }, file: updated, ok: true };
}

export function renameFyloFile(
  state: FyloState,
  id: string,
  nextNameRaw: string,
): { state: FyloState; file?: FyloFile; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing) return { state, ok: false, reason: 'Only player-owned files in Fylo can be renamed.' };
  if (!canManageInFylo(existing)) return { state, ok: false, reason: 'Protected system and institutional files cannot be renamed.' };
  if (existing.trashedAt) return { state, ok: false, reason: 'Restore this file from Trash before renaming.' };
  const trimmed = (nextNameRaw || '').trim();
  if (!trimmed) return { state, ok: false, reason: 'Enter a valid filename.' };
  const finalName = trimmed.includes('.') ? trimmed : `${trimmed}.${existing.type}`;
  if (extractExtension(finalName) !== existing.type) {
    return { state, ok: false, reason: `Files must retain their original .${existing.type} extension.` };
  }
  const updated: FyloFile = { ...existing, name: finalName, updatedAt: new Date().toISOString() };
  return { state: { ...state, files: { ...state.files, [id]: updated } }, file: updated, ok: true };
}

export function moveFyloFile(
  state: FyloState,
  id: string,
  targetDir: string,
): { state: FyloState; file?: FyloFile; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing) return { state, ok: false, reason: 'Only player-owned files in Fylo can be moved.' };
  if (!canManageInFylo(existing)) return { state, ok: false, reason: 'Protected files cannot be moved.' };
  if (existing.trashedAt) return { state, ok: false, reason: 'Restore this file from Trash first.' };
  const dir = sanitizeFyloDir(targetDir, existing.dir);
  const updated: FyloFile = { ...existing, dir, updatedAt: new Date().toISOString() };
  return { state: { ...state, files: { ...state.files, [id]: updated } }, file: updated, ok: true };
}

export function copyFyloFile(
  state: FyloState,
  source: any,
  targetDir?: string,
): { state: FyloState; file?: FyloFile; ok: boolean; reason?: string } {
  if (!source || !source.name) return { state, ok: false, reason: 'Select a file to copy.' };
  const ext = extractExtension(source.name);
  const base = source.name.replace(new RegExp(`\\.${ext}$`, 'i'), '');
  const copyName = `${base}_copy.${ext}`;
  const now = new Date().toISOString();
  const id = `fylo-copy-${crypto.randomUUID()}`;
  const file: FyloFile = {
    id,
    name: copyName,
    type: ext,
    dir: sanitizeFyloDir(targetDir || (source.dir === '/system' ? '/documents' : source.dir), '/documents'),
    size: source.size || formatFileSize(source.body || ''),
    desc: source.desc ? `Copy of ${source.desc}` : 'Personal copy',
    body: source.body,
    imageUrl: source.imageUrl,
    document: source.document ? structuredClone(source.document) : undefined,
    owner: 'player',
    protected: false,
    origin: source.origin || 'fylo',
    publisher: source.publisher,
    version: 'copy',
    createdAt: now,
    updatedAt: now,
    trashedAt: null,
  };
  return { state: { ...state, files: { ...state.files, [id]: file } }, file, ok: true };
}

export function toggleFyloFavorite(state: FyloState, key: string): { state: FyloState; pinned: boolean } {
  const exists = state.favorites.includes(key);
  const favorites = exists ? state.favorites.filter(item => item !== key) : [...state.favorites, key];
  return { state: { ...state, favorites }, pinned: !exists };
}

export function retainAttachmentInFylo(
  state: FyloState,
  input: {
    id: string;
    name: string;
    desc?: string;
    body?: string;
    imageUrl?: string;
    document?: any;
    dir?: string;
    publisher?: string;
    mailId?: string;
    origin?: FyloFileOrigin;
    version?: string;
  },
): { state: FyloState; file: FyloFile; alreadyRetained: boolean } {
  const existing = state.files[input.id];
  if (existing && !existing.trashedAt) {
    return { state, file: existing, alreadyRetained: true };
  }
  const now = new Date().toISOString();
  const type = extractExtension(input.name);
  const spec = resolveFileExtension(input.name);
  const file: FyloFile = {
    id: input.id,
    name: input.name,
    type,
    dir: sanitizeFyloDir(input.dir, FYLO_MAIL_DOWNLOADS_DIR),
    size: input.body ? formatFileSize(input.body) : 'Saved copy',
    desc: input.desc || spec.purpose,
    body: input.body,
    imageUrl: input.imageUrl,
    document: input.document ? structuredClone(input.document) : undefined,
    owner: 'player',
    protected: false,
    origin: input.origin || 'auremail',
    publisher: input.publisher,
    mailId: input.mailId,
    version: input.version || 'original',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    trashedAt: null,
  };
  return { state: { ...state, files: { ...state.files, [file.id]: file } }, file, alreadyRetained: false };
}

export function trashFyloFile(
  state: FyloState,
  id: string,
): { state: FyloState; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing) return { state, ok: false, reason: 'Only player-owned files in Fylo can be moved to Trash.' };
  if (!canTrashInFylo(existing)) return { state, ok: false, reason: 'Protected system and institutional files cannot be moved to Trash.' };
  if (existing.trashedAt) return { state, ok: false, reason: 'This file is already in Trash.' };
  const next: FyloFile = {
    ...existing,
    previousDir: existing.dir,
    dir: FYLO_TRASH_DIR,
    trashedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { state: { ...state, files: { ...state.files, [id]: next } }, ok: true };
}

export function restoreFyloFile(
  state: FyloState,
  id: string,
): { state: FyloState; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing || !existing.trashedAt) return { state, ok: false, reason: 'This file is not in Trash.' };
  const next: FyloFile = {
    ...existing,
    dir: sanitizeFyloDir(existing.previousDir, FYLO_NOTES_DIR),
    previousDir: undefined,
    trashedAt: null,
    updatedAt: new Date().toISOString(),
  };
  return { state: { ...state, files: { ...state.files, [id]: next } }, ok: true };
}

export function deleteFyloFilePermanently(
  state: FyloState,
  id: string,
): { state: FyloState; ok: boolean; reason?: string } {
  const existing = state.files[id];
  if (!existing) return { state, ok: false, reason: 'File not found.' };
  if (!canTrashInFylo(existing)) return { state, ok: false, reason: 'Protected files cannot be deleted.' };
  if (!existing.trashedAt) return { state, ok: false, reason: 'Move the file to Trash before permanently deleting it.' };
  const nextFiles = { ...state.files };
  delete nextFiles[id];
  return { state: { ...state, files: nextFiles }, ok: true };
}

export function emptyFyloTrash(state: FyloState): { state: FyloState; removedCount: number } {
  const nextFiles: Record<string, FyloFile> = {};
  let removedCount = 0;
  for (const [id, file] of Object.entries(state.files)) {
    if (file.trashedAt && canTrashInFylo(file)) {
      removedCount += 1;
    } else {
      nextFiles[id] = file;
    }
  }
  return { state: { ...state, files: nextFiles }, removedCount };
}

export function toMailAttachment(file: any) {
  const name = String(file?.name || 'document.txt');
  const ext = extractExtension(name);
  const spec = resolveFileExtension(name);
  const kind: 'form' | 'record' | 'file' =
    ext === 'osform' || ext === 'form'
      ? 'form'
      : ext === 'pdf' || ext === 'doc' || ext === 'docx' || ext === 'arch' || ext === 'diag'
        ? 'record'
        : 'file';
  // Durable snapshot of attachment contents so later edits don't mutate sent mail
  const snapshotText = String(file.body || file.document?.content?.bodyText || file.desc || spec.purpose);
  return {
    id: `fylo-att-${file.id || name}`,
    name,
    kind,
    isReward: false,
    type: ext,
    amount: 0,
    xp: 0,
    claimed: false,
    mockKey: file.mockKey,
    previewTitle: file.document?.content?.title || file.desc || name,
    previewText: snapshotText,
    version: file.version || 'original',
    provenance: `Attached from Fylo (${file.dir || '/documents'}) · ${spec.dotExt} (${spec.associatedApp})`,
  };
}
