import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier,context); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`,context); } } });
const values = new Map();
globalThis.localStorage = { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
globalThis.window = { external:{}, localStorage:globalThis.localStorage };
const { useOSStore: os } = await import('../src/store/useOSStore.ts');
const { parseBankAmount, executeBankCommand, restoreBanking, BANK_PAYEES } = await import('../src/gameplay/Banking.ts');
const { CREATOR_STUDIO_STORAGE_KEY } = await import('../src/integration/worldStateManager.ts');
const initial = os.getState();
const player = () => os.getState().gameplay.player;
const command = (kind,amount,requestId,extra={}) => ({kind,amount,requestId,memo:'',...extra});
function reset() { values.clear();os.setState(initial,true);os.setState(state=>({isLoggedIn:true,gameplay:{...state.gameplay,player:{...state.gameplay.player,credits:1000,bits:9,banking:undefined}}})); }

test('savings conserves credits; transfers atomically settle recipients and receipts exactly once',()=>{
  reset();
  const act = os.getState().bankAction;
  assert.equal(act(command('deposit',250,'save',{recipient:BANK_PAYEES[0].id})).ok,true);
  assert.equal(player().banking.recipientBalances[BANK_PAYEES[0].id],0);
  assert.deepEqual([player().credits,player().banking.savings,player().bits],[750,250,9]);
  assert.equal(act(command('withdraw',100,'withdraw')).ok,true);
  const transfer = command('transfer',75,'send',{recipient:BANK_PAYEES[0].id,memo:'Shared supplies'});
  const result = act(transfer);
  assert.equal(result.ok,true);
  assert.deepEqual([player().credits,player().banking.savings,player().banking.recipientBalances[BANK_PAYEES[0].id]],[775,150,75]);
  assert.equal(player().banking.entries.length,3);
  assert.equal(act(transfer).entry.id,result.entry.id);
  assert.equal(player().banking.entries.length,3);
  assert.equal(act({...transfer,amount:76}).ok,false);
  assert.deepEqual(result.entry.balanceAfter,{credits:775,savings:150,bits:9});
});

test('rejects invalid values, insufficient funds, unknown recipients and overflowing accounts without changing balances',()=>{
  reset();
  for (const input of ['','0','-1','1.5','1e3','Infinity','12credits','9007199254740992']) assert.equal(parseBankAmount(input),null,input);
  assert.equal(parseBankAmount(' 250 '),250);
  const before = player();
  for (const value of [-1,0,0.5,NaN,Infinity,1001,Number.MAX_SAFE_INTEGER+1]) assert.equal(os.getState().bankAction(command('deposit',value,`bad:${value}`)).ok,false);
  for (const recipient of ['',undefined,'constructor','MAID-4402-CIV']) assert.equal(os.getState().bankAction(command('transfer',50,'recipient',{recipient})).ok,false);
  assert.equal(os.getState().bankAction(command('withdraw',1,'empty')).ok,false);
  assert.equal(os.getState().bankAction(command('deposit',1,'memo',{memo:'x'.repeat(161)})).ok,false);
  assert.equal(player(),before);
  const full = {...before,banking:{...restoreBanking(null),savings:Number.MAX_SAFE_INTEGER}};
  assert.equal(executeBankCommand(full,command('deposit',1,'overflow')).ok,false);
});

test('bank actions require login and an active world',()=>{
  reset();const before=player();
  os.setState({isLoggedIn:false});assert.equal(os.getState().bankAction(command('deposit',10,'denied')).ok,false);
  os.setState({isLoggedIn:true});values.set(CREATOR_STUDIO_STORAGE_KEY,JSON.stringify({isPaused:true}));
  assert.equal(os.getState().bankAction(command('deposit',10,'paused')).ok,false);
  assert.equal(player(),before);
});

test('actual gameplay income and purchases journal alongside banking and survive saved-state hydration',async()=>{
  reset();os.getState().bankAction(command('deposit',200,'saved'));
  os.getState().addCredits(50);os.getState().addBits(3);
  assert.equal(os.getState().purchaseHousingUpgrade('mattress',350).ok,true);
  assert.equal(player().banking.entries.length,4);
  assert.deepEqual(player().banking.entries.map(entry=>[entry.credits,entry.savings,entry.bits]),[[-200,200,0],[50,0,0],[0,0,3],[-350,0,0]]);
  const saved=JSON.parse(values.get('miraverse-os-progress'));
  os.setState(initial,true);
  values.set('miraverse-os-progress',JSON.stringify(saved));
  await os.persist.rehydrate();
  assert.deepEqual(player().banking,saved.state.gameplay.player.banking);
  assert.equal(player().credits,500);
  assert.equal(os.getState().bankAction(command('deposit',200,'saved')).ok,true);
  assert.equal(player().credits,500);
});

test('legacy saves retain balances with empty savings and no fabricated historical transactions',async()=>{
  reset();const legacy={...os.getState().gameplay,player:{...player(),credits:432,bits:7}};
  delete legacy.player.banking;
  values.set('miraverse-os-progress',JSON.stringify({version:1,state:{gameplay:legacy,isLoggedIn:true}}));
  await os.persist.rehydrate();
  assert.equal(player().credits,432);assert.equal(player().bits,7);
  assert.equal(player().banking.savings,0);assert.deepEqual(player().banking.entries,[]);
});
