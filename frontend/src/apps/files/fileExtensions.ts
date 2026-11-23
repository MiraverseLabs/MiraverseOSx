export type FileExtensionCategory =
  | 'Documents, Forms and Personal Files'
  | 'System and Technical Files'
  | 'Geographic and Network Files'
  | 'SpellForge and Specialized Files'
  | 'Medical and Diagnostic Files'
  | 'Audio and Image Files'
  | 'Financial and Institutional Files';

export type FyloViewerKind = 'document' | 'note' | 'signal' | 'image';

export interface FileExtensionSpec {
  ext: string;
  dotExt: string;
  category: FileExtensionCategory;
  purpose: string;
  associatedApp: string;
  viewer: FyloViewerKind;
  editableInFylo?: boolean;
  protectedByDefault?: boolean;
}

export const CORE_APPLICATIONS = [
  {
    name: 'Fylo (Fylo Systems)',
    purpose:
      'Manages files, folders, downloads, personal notes, saved documents and Trash. Opens files through compatible applications. Fylo does not automatically edit every file type.',
  },
  {
    name: 'AureMail',
    purpose:
      'Sends and receives email and file attachments. Attachments retain their original extensions, contents and application associations.',
  },
  {
    name: 'VerseNet',
    purpose:
      'Provides access to public information, institutional websites, services and downloadable resources. Downloaded files can be retained in Fylo.',
  },
  {
    name: 'Document Studio',
    purpose:
      'Creates, edits, formats and prepares compatible documents and reports. Does not automatically grant authority to modify official institutional records.',
  },
] as const;

export const GENERAL_FILE_RULES = [
  'Attachments are ordinary files, not separate file types.',
  'Every file retains its original extension and contents when sent, received, downloaded or saved.',
  'A compatible application determines how a file is opened, interpreted or edited.',
  'Fylo stores and organizes files but is not a universal editor.',
  'File possession does not automatically grant editing rights or institutional authority.',
  'A saved attachment becomes an independent retained file.',
  'Protected system and institutional files may have restricted actions.',
  'Player-owned files can be moved to Trash, restored or permanently deleted according to permissions.',
  'File associations describe intended behavior, not necessarily currently implemented functionality.',
  'New file formats and viewers require implementation and compatibility validation.',
] as const;

export const FILE_EXTENSIONS: readonly FileExtensionSpec[] = [
  // Documents, Forms and Personal Files (8)
  { ext: 'osform', dotExt: '.osform', category: 'Documents, Forms and Personal Files', purpose: 'Interactive OS form', associatedApp: 'Form viewer / compatible institutional service', viewer: 'document' },
  { ext: 'form', dotExt: '.form', category: 'Documents, Forms and Personal Files', purpose: 'General interactive form', associatedApp: 'Form viewer / compatible form editor', viewer: 'document' },
  { ext: 'doc', dotExt: '.doc', category: 'Documents, Forms and Personal Files', purpose: 'Editable document', associatedApp: 'Document Studio', viewer: 'document' },
  { ext: 'docx', dotExt: '.docx', category: 'Documents, Forms and Personal Files', purpose: 'Modern editable document', associatedApp: 'Document Studio', viewer: 'document' },
  { ext: 'txt', dotExt: '.txt', category: 'Documents, Forms and Personal Files', purpose: 'Plain-text document', associatedApp: 'Text editor', viewer: 'note', editableInFylo: true },
  { ext: 'pdf', dotExt: '.pdf', category: 'Documents, Forms and Personal Files', purpose: 'Fixed-layout document', associatedApp: 'PDF viewer', viewer: 'document' },
  { ext: 'note', dotExt: '.note', category: 'Documents, Forms and Personal Files', purpose: 'Rich-text personal note', associatedApp: 'Fylo Note Editor', viewer: 'note', editableInFylo: true },
  { ext: 'ics', dotExt: '.ics', category: 'Documents, Forms and Personal Files', purpose: 'Calendar invitation or event', associatedApp: 'Calendar application', viewer: 'document' },

  // System and Technical Files (5)
  { ext: 'log', dotExt: '.log', category: 'System and Technical Files', purpose: 'System, activity or audit log', associatedApp: 'Log Viewer', viewer: 'document' },
  { ext: 'sys', dotExt: '.sys', category: 'System and Technical Files', purpose: 'System component or driver', associatedApp: 'System tools / protected system viewer', viewer: 'document', protectedByDefault: true },
  { ext: 'arch', dotExt: '.arch', category: 'System and Technical Files', purpose: 'Archived records or data', associatedApp: 'Archive Viewer', viewer: 'document' },
  { ext: 'prism', dotExt: '.prism', category: 'System and Technical Files', purpose: 'PRISM-related file', associatedApp: 'Compatible PRISM diagnostic or analysis tool', viewer: 'document', protectedByDefault: true },
  { ext: 'corrupt', dotExt: '.corrupt', category: 'System and Technical Files', purpose: 'Corrupted or damaged data', associatedApp: 'File Recovery / diagnostic viewer', viewer: 'document', protectedByDefault: true },

  // Geographic and Network Files (3)
  { ext: 'map', dotExt: '.map', category: 'Geographic and Network Files', purpose: 'Map data', associatedApp: 'Map Viewer', viewer: 'document' },
  { ext: 'node', dotExt: '.node', category: 'Geographic and Network Files', purpose: 'Node data', associatedApp: 'Compatible network or node viewer', viewer: 'document' },
  { ext: 'grid', dotExt: '.grid', category: 'Geographic and Network Files', purpose: 'Grid data', associatedApp: 'Compatible mapping or grid viewer', viewer: 'document' },

  // SpellForge and Specialized Files (3)
  { ext: 'mod', dotExt: '.mod', category: 'SpellForge and Specialized Files', purpose: 'Module', associatedApp: 'SpellForge', viewer: 'document' },
  { ext: 'spell', dotExt: '.spell', category: 'SpellForge and Specialized Files', purpose: 'Spell recipe or configuration', associatedApp: 'SpellForge', viewer: 'document' },
  { ext: 'veil', dotExt: '.veil', category: 'SpellForge and Specialized Files', purpose: 'Veil-related data', associatedApp: 'Compatible Veil analysis tool', viewer: 'document' },

  // Medical and Diagnostic Files (2)
  { ext: 'diag', dotExt: '.diag', category: 'Medical and Diagnostic Files', purpose: 'Diagnostic report', associatedApp: 'Diagnostic Viewer / compatible medical system', viewer: 'document' },
  { ext: 'aura', dotExt: '.aura', category: 'Medical and Diagnostic Files', purpose: 'Aura or biometric data', associatedApp: 'Compatible aura analysis or medical system', viewer: 'document' },

  // Audio and Image Files (7)
  { ext: 'sig', dotExt: '.sig', category: 'Audio and Image Files', purpose: 'Signal or transmission data', associatedApp: 'Signal Player', viewer: 'signal' },
  { ext: 'wav', dotExt: '.wav', category: 'Audio and Image Files', purpose: 'Audio recording', associatedApp: 'Audio Player / Signal Player', viewer: 'signal' },
  { ext: 'img', dotExt: '.img', category: 'Audio and Image Files', purpose: 'Image-related file', associatedApp: 'Image Viewer / compatible image utility', viewer: 'image' },
  { ext: 'jpg', dotExt: '.jpg', category: 'Audio and Image Files', purpose: 'JPEG image', associatedApp: 'Image Viewer', viewer: 'image' },
  { ext: 'jpeg', dotExt: '.jpeg', category: 'Audio and Image Files', purpose: 'JPEG image', associatedApp: 'Image Viewer', viewer: 'image' },
  { ext: 'png', dotExt: '.png', category: 'Audio and Image Files', purpose: 'PNG image', associatedApp: 'Image Viewer', viewer: 'image' },
  { ext: 'webp', dotExt: '.webp', category: 'Audio and Image Files', purpose: 'WebP image', associatedApp: 'Image Viewer', viewer: 'image' },

  // Financial and Institutional Files (2)
  { ext: 'grant', dotExt: '.grant', category: 'Financial and Institutional Files', purpose: 'Grant-related record or data', associatedApp: 'Compatible grant or institutional service', viewer: 'document', protectedByDefault: true },
  { ext: 'payment', dotExt: '.payment', category: 'Financial and Institutional Files', purpose: 'Payment-related record or data', associatedApp: 'Compatible financial or institutional service', viewer: 'document', protectedByDefault: true },
] as const;

const EXTENSION_MAP = new Map<string, FileExtensionSpec>(
  FILE_EXTENSIONS.map(spec => [spec.ext, spec]),
);

export function extractExtension(nameOrExt: string): string {
  const trimmed = String(nameOrExt || '').trim();
  if (!trimmed) return 'txt';
  const dot = trimmed.lastIndexOf('.');
  const raw = dot >= 0 ? trimmed.slice(dot + 1) : trimmed;
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '') || 'txt';
}

export function resolveFileExtension(nameOrExt: string): FileExtensionSpec {
  const ext = extractExtension(nameOrExt);
  const known = EXTENSION_MAP.get(ext);
  if (known) return known;
  return {
    ext,
    dotExt: `.${ext}`,
    category: 'Documents, Forms and Personal Files',
    purpose: 'Unregistered file type',
    associatedApp: 'Compatible viewer (requires validation)',
    viewer: 'document',
  };
}

export function isKnownExtension(nameOrExt: string): boolean {
  return EXTENSION_MAP.has(extractExtension(nameOrExt));
}
