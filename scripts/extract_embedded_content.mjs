// Parse source as data. Never import, evaluate, or execute a game module.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(scriptRoot, 'frontend/package.json'));
const { parse } = require('@babel/parser');

export function extractCode(text, filename) {
  const definitions = [], fragments = [], errors = [];
  let ast;
  try {
    ast = parse(text, { sourceType: 'unambiguous', errorRecovery: true,
      plugins: [ ...( /\.[cm]?tsx?$/.test(filename) ? ['typescript'] : [] ),
        ...( /\.[jt]sx$/.test(filename) ? ['jsx'] : [] ) ] });
    for (const error of ast.errors || []) errors.push({ line: error.loc?.line, message: error.message });
  } catch (error) { return { definitions, fragments, errors: [{ line: error.loc?.line, message: error.message }] }; }
  const source = node => text.slice(node.start, node.end);
  const unwrap = node => ['TSAsExpression','TSSatisfiesExpression','TSNonNullExpression','TypeCastExpression','ParenthesizedExpression'].includes(node?.type) ? unwrap(node.expression) : node;
  const symbolic = node => ({ value: { $sourceExpression: { type: node.type, text: source(node) } }, unresolved: 1 });
  function encode(raw) {
    const node = unwrap(raw);
    if (!node) return { value: null, unresolved: 0 };
    if (['StringLiteral','NumericLiteral','BooleanLiteral'].includes(node.type)) return { value: node.value, unresolved: 0 };
    if (node.type === 'NullLiteral') return { value: null, unresolved: 0 };
    if (node.type === 'TemplateLiteral' && !node.expressions.length) return { value: node.quasis[0].value.cooked ?? node.quasis[0].value.raw, unresolved: 0 };
    if (node.type === 'UnaryExpression' && ['+','-','!'].includes(node.operator)) {
      const child = encode(node.argument);
      if (!child.unresolved && (typeof child.value === 'number' || node.operator === '!')) return { value: node.operator === '-' ? -child.value : node.operator === '+' ? +child.value : !child.value, unresolved: 0 };
    }
    if (node.type === 'ArrayExpression') {
      const items = node.elements.map(item => item ? encode(item) : { value: { $arrayHole: true }, unresolved: 1 });
      return { value: items.map(item => item.value), unresolved: items.reduce((sum, item) => sum + item.unresolved, 0) };
    }
    if (node.type === 'ObjectExpression') {
      const value = Object.create(null); let unresolved = 0; const extras = [];
      for (const property of node.properties) {
        if (property.type !== 'ObjectProperty' || property.computed) { extras.push(symbolic(property).value); unresolved++; continue; }
        const key = property.key.name ?? property.key.value;
        if (Object.hasOwn(value, key)) { extras.push(symbolic(property).value); unresolved++; continue; }
        const encoded = encode(property.value); value[key] = encoded.value; unresolved += encoded.unresolved;
      }
      if (extras.length) value.$sourceProperties = extras;
      return { value, unresolved };
    }
    return symbolic(node);
  }
  const emitted = new Set();
  function emit(raw, name, kind, scope) {
    const node = unwrap(raw);
    if (!node || emitted.has(node.start)) return;
    emitted.add(node.start);
    const result = encode(node);
    definitions.push({ name, kind, scope, line: node.loc.start.line, endLine: node.loc.end.line,
      start: node.start, end: node.end, nodeType: node.type, text: source(node),
      completeness: result.unresolved === 0 ? 'literal' : ['ObjectExpression','ArrayExpression'].includes(node.type) ? 'partial' : 'expression',
      unresolved: result.unresolved, value: result.value });
  }
  function visit(node, scope = 'module', literalParent = false, parent = null, field = '') {
    if (!node || typeof node !== 'object' || !node.type) return;
    const isFunction = /Function/.test(node.type) || ['ObjectMethod','ClassMethod','ClassPrivateMethod'].includes(node.type);
    const nextScope = isFunction ? `${scope}/${node.id?.name || node.key?.name || `function@${node.loc?.start.line}`}` : scope;
    if (node.type === 'VariableDeclarator' && node.init) {
      const name = node.id.type === 'Identifier' ? node.id.name : source(node.id);
      emit(node.init, name, 'variable', scope);
    }
    if (['ClassProperty','ClassPrivateProperty'].includes(node.type) && node.value) emit(node.value, node.key.name || source(node.key), 'class-field', scope);
    if (node.type === 'ExportDefaultDeclaration' && !/Declaration$/.test(node.declaration.type)) emit(node.declaration, 'default', 'default-export', scope);
    if (['ObjectExpression','ArrayExpression'].includes(node.type) && !literalParent) emit(node, `${field || 'literal'}@${node.loc.start.line}`, 'literal-block', scope);
    if (node.type === 'TSEnumDeclaration') {
      definitions.push({ name: node.id.name, kind: 'enum', scope, line: node.loc.start.line, endLine: node.loc.end.line,
        start: node.start, end: node.end, nodeType: node.type, text: source(node), completeness: 'partial',
        unresolved: node.members.filter(member => !member.initializer).length,
        value: Object.fromEntries(node.members.map(member => [member.id.name ?? member.id.value,
          member.initializer ? encode(member.initializer).value : { $implicitEnumValue: true }])) });
    }
    if (['StringLiteral','JSXText','TemplateElement'].includes(node.type)) {
      const value = node.type === 'TemplateElement' ? node.value.cooked ?? node.value.raw : node.value;
      if (typeof value === 'string' && value.trim()) fragments.push({ line: node.loc.start.line, start: node.start,
        kind: node.type, context: parent?.type || '', text: value });
    }
    const insideLiteral = isFunction ? false : literalParent || ['ObjectExpression','ArrayExpression'].includes(node.type);
    for (const [key, child] of Object.entries(node)) {
      if (['loc','tokens','comments','leadingComments','trailingComments','innerComments','errors'].includes(key)) continue;
      if (Array.isArray(child)) for (const item of child) visit(item, nextScope, insideLiteral, node, key);
      else if (child && typeof child === 'object') visit(child, nextScope, insideLiteral, node, key);
    }
  }
  visit(ast.program);
  return { definitions, fragments, errors };
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? (['node_modules','dist','build','.git'].includes(entry.name) ? [] : files(full)) : [full];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || scriptRoot);
  const sources = files(path.join(root, 'frontend/src')).filter(file => /\.[cm]?[jt]sx?$/.test(file));
  for (const full of sources) {
    const filename = path.relative(root, full).split(path.sep).join('/');
    const raw = readFileSync(full);
    const text = raw.toString('utf8');
    // Generated compatibility loaders refer to already-imported character data.
    const generated = filename.startsWith('frontend/src/game-content/characters/collections/');
    const result = generated ? { definitions: [], fragments: [], errors: [] } : extractCode(text, filename);
    process.stdout.write(JSON.stringify({ path: filename, sha256: createHash('sha256').update(raw).digest('hex'), generated, ...result }) + '\n');
  }
}
