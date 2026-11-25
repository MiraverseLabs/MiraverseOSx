import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCode } from './extract_embedded_content.mjs';

test('extracts fixed typed values, preserves Unicode, and does not execute source', () => {
  const code = `const people: Person[] = [{id:'p1',name:'Renée',age:20}]; globalThis.DO_NOT_RUN = true;`;
  const result = extractCode(code, 'sample.ts');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(JSON.parse(JSON.stringify(result.definitions.find(item => item.name==='people').value)),
    [{id:'p1',name:'Renée',age:20}]);
  assert.equal(globalThis.DO_NOT_RUN, undefined);
});

test('keeps functions and unresolved references explicit inside partial data', () => {
  const result = extractCode(`const clinic = {name:'Clinic', icon:Stethoscope, staff:getProfiles(), get pay(){throw Error('never');}};`, 'sample.ts');
  const record = result.definitions.find(item => item.name==='clinic');
  assert.equal(record.completeness, 'partial');
  assert.equal(record.value.name, 'Clinic');
  assert.equal(record.value.icon.$sourceExpression.text, 'Stethoscope');
  assert.equal(record.value.staff.$sourceExpression.text, 'getProfiles()');
  assert.equal(record.value.$sourceProperties[0].$sourceExpression.type, 'ObjectMethod');
});

test('captures literal data inside store callbacks and JSX prose', () => {
  const result = extractCode(`export const useStore=create(()=>({balance:100,people:[{name:'Aelita'}]}));
  function Page(){return <div title="Hello">Welcome to Aureline</div>}`, 'sample.tsx');
  assert.equal(result.definitions.find(item => item.name==='useStore').completeness, 'expression');
  assert.ok(result.definitions.some(item => item.value?.balance===100));
  assert.ok(result.fragments.some(item => item.text==='Welcome to Aureline'));
});

test('preserves computed keys, spreads, duplicate properties and templates', () => {
  const result = extractCode('const x={...other,[key]:1,name:"First",name:"Second",description:`Hi ${user}`};', 'sample.ts');
  const record = result.definitions.find(item => item.name==='x');
  assert.equal(record.completeness,'partial');
  assert.equal(record.value.$sourceProperties.length,3);
  assert.equal(record.value.description.$sourceExpression.type,'TemplateLiteral');
});

test('reports syntax errors without treating broken code as empty success', () => {
  assert.ok(extractCode('const x = [;', 'sample.ts').errors.length);
});
