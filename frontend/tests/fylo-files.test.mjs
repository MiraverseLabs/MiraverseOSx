import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const { FILE_EXTENSIONS, CORE_APPLICATIONS, GENERAL_FILE_RULES, resolveFileExtension, isKnownExtension } =
  await import('../src/apps/files/fileExtensions.ts');
const {
  emptyFyloState,
  restoreFyloState,
  createFyloFolder,
  createPersonalNote,
  updateFyloNote,
  renameFyloFile,
  moveFyloFile,
  copyFyloFile,
  toggleFyloFavorite,
  retainAttachmentInFylo,
  trashFyloFile,
  restoreFyloFile,
  deleteFyloFilePermanently,
  emptyFyloTrash,
  toMailAttachment,
  FYLO_TRASH_DIR,
} = await import('../src/apps/files/fyloStore.ts');

test('Fylo defines all 30 canonical file extensions, 4 core apps, and 10 general rules', () => {
  assert.equal(FILE_EXTENSIONS.length, 30);
  assert.equal(new Set(FILE_EXTENSIONS.map(e => e.ext)).size, 30);
  assert.equal(CORE_APPLICATIONS.length, 4);
  assert.equal(GENERAL_FILE_RULES.length, 10);

  const expected = [
    'osform', 'form', 'doc', 'docx', 'txt', 'pdf', 'note', 'ics',
    'log', 'sys', 'arch', 'prism', 'corrupt',
    'map', 'node', 'grid',
    'mod', 'spell', 'veil',
    'diag', 'aura',
    'sig', 'wav', 'img', 'jpg', 'jpeg', 'png', 'webp',
    'grant', 'payment',
  ];
  for (const ext of expected) {
    assert.equal(isKnownExtension(`sample.${ext}`), true, `Missing .${ext}`);
    assert.equal(resolveFileExtension(`sample.${ext}`).dotExt, `.${ext}`);
  }
  assert.equal(resolveFileExtension('Field_Log.note').associatedApp, 'Fylo Note Editor');
  assert.equal(resolveFileExtension('Report.docx').associatedApp, 'Document Studio');
  assert.equal(resolveFileExtension('Shield.spell').associatedApp, 'SpellForge');
  assert.equal(resolveFileExtension('Photo.webp').viewer, 'image');
  assert.equal(resolveFileExtension('Audio.wav').viewer, 'signal');
});

test('Fylo enforces personal note editing, Trash lifecycle, independent saved attachments, and protected file rules', () => {
  let state = emptyFyloState();

  // Rule 4: Fylo creates .note and .txt, not arbitrary binary/institutional formats
  assert.equal(createPersonalNote(state, { name: 'Bad.pdf', body: 'x' }).ok, false);
  const created = createPersonalNote(state, { name: 'Tunnel_Notes', ext: 'note', body: 'PID 512 at 88.2 MHz' });
  assert.equal(created.ok, true);
  assert.equal(created.file.name, 'Tunnel_Notes.note');
  state = created.state;

  // Rule 2: Updating a note retains its original extension
  assert.equal(updateFyloNote(state, created.file.id, { name: 'Tunnel_Notes.pdf' }).ok, false);
  const updated = updateFyloNote(state, created.file.id, { body: 'PID 512 at 88.2 MHz — sealed.' });
  assert.equal(updated.ok, true);
  state = updated.state;

  // Rule 6: Retained attachment is an independent file in Fylo
  const retained = retainAttachmentInFylo(state, {
    id: 'mail:MSG-1:att-1',
    name: 'Clinical_Referral.pdf',
    desc: 'Faith Medical referral',
    body: 'Baseline screening requested.',
    mailId: 'MSG-1',
    origin: 'auremail',
  });
  assert.equal(retained.alreadyRetained, false);
  assert.equal(retained.file.type, 'pdf');
  state = retained.state;

  // Rule 4: Retained .pdf is not editable in Fylo Note Editor
  assert.equal(updateFyloNote(state, retained.file.id, { body: 'tampered' }).ok, false);

  // Rule 8: Move to Trash, restore, and permanent delete
  const trashed = trashFyloFile(state, created.file.id);
  assert.equal(trashed.ok, true);
  assert.equal(trashed.state.files[created.file.id].dir, FYLO_TRASH_DIR);
  state = trashed.state;

  const restored = restoreFyloFile(state, created.file.id);
  assert.equal(restored.ok, true);
  assert.equal(restored.state.files[created.file.id].dir, '/notes');
  state = restored.state;

  // Cannot permanently delete before moving to Trash
  assert.equal(deleteFyloFilePermanently(state, created.file.id).ok, false);
  state = trashFyloFile(state, created.file.id).state;
  const emptied = emptyFyloTrash(state);
  assert.equal(emptied.removedCount, 1);
  assert.equal(emptied.state.files[created.file.id], undefined);
  state = emptied.state;

  // Rule 1 & 2: Converting a Fylo file into an AureMail attachment retains extension & contents, never mints rewards
  const mailAtt = toMailAttachment(retained.file);
  assert.equal(mailAtt.name, 'Clinical_Referral.pdf');
  assert.equal(mailAtt.type, 'pdf');
  assert.equal(mailAtt.isReward, false);
  assert.equal(mailAtt.amount, 0);

  // Malformed save recovery
  const recovered = restoreFyloState({ files: { bad: null, good: { name: 'Recovered.txt', body: 'hi' } }, folders: ['/custom', 42], favorites: ['good', null] });
  assert.equal(Object.keys(recovered.files).length, 1);
  assert.equal(recovered.files.good.name, 'Recovered.txt');
  assert.deepEqual(recovered.folders, ['/custom']);
  assert.deepEqual(recovered.favorites, ['good']);
});

test('Fylo supports folder creation, rename with extension retention, move, copy, and favorites', () => {
  let state = emptyFyloState();
  const folderRes = createFyloFolder(state, 'Case Notes');
  assert.equal(folderRes.ok, true);
  assert.equal(folderRes.dir, '/case-notes');
  state = folderRes.state;

  const noteRes = createPersonalNote(state, { name: 'Lead_01.note', body: 'Initial lead' });
  state = noteRes.state;
  const id = noteRes.file.id;

  // Rename retains extension and rejects changing extension
  assert.equal(renameFyloFile(state, id, 'Lead_01.pdf').ok, false);
  const renamed = renameFyloFile(state, id, 'Lead_Final');
  assert.equal(renamed.ok, true);
  assert.equal(renamed.file.name, 'Lead_Final.note');
  assert.equal(renamed.file.id, id);
  state = renamed.state;

  // Move preserves stable file ID
  const moved = moveFyloFile(state, id, '/case-notes');
  assert.equal(moved.ok, true);
  assert.equal(moved.file.dir, '/case-notes');
  assert.equal(moved.file.id, id);
  state = moved.state;

  // Copy creates independent player-owned copy with same extension
  const copied = copyFyloFile(state, moved.file);
  assert.equal(copied.ok, true);
  assert.equal(copied.file.name, 'Lead_Final_copy.note');
  assert.notEqual(copied.file.id, id);
  state = copied.state;

  // Favorite pin & unpin
  const pinned = toggleFyloFavorite(state, id);
  assert.equal(pinned.pinned, true);
  assert.equal(toggleFyloFavorite(pinned.state, id).pinned, false);
});
