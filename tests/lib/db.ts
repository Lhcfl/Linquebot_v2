Object.defineProperty(Symbol, 'dispose', {
  value: '@@dispose',
});
Object.defineProperty(Symbol, 'asyncDispose', {
  value: '@@asyncDispose',
});

import { DBManager } from '../../src/lib/newdb.ts';
//import fs from 'fs/promises';

type RegType = { [k: string]: { [pk: string | number]: unknown }[] };

function mkDB(): [RegType, DBManager] {
  const reg: RegType = {};
  return [
    reg,
    new DBManager({
      async read(name: string) {
        return name in reg ? reg[name][reg[name].length - 1] : {};
      },
      async write(name: string, data: { [k: string | number]: unknown }) {
        if (!(name in reg)) reg[name] = [];
        reg[name].push(data);
      },
    }),
  ];
}

test('simple data', async () => {
  const [ctnt, mgr] = mkDB();
  await expect(mgr.db('a')).rejects.toThrow(new Error('Unregistered database: a'));
  const weird_name = '*?*?//\\\\weird name';
  const supinit = () => ({ a: 0, b: 1 });
  const subinit = () => 'sub';

  mgr.register(weird_name, { data: supinit, sub: { data: subinit } });
  // Expect array-form and initializer-form initializing to be the same
  mgr.register('array init test', [supinit, subinit]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = (mgr as any).registry;
  expect(reg[weird_name]).toEqual(reg['array init test']);

  {
    using db = await mgr.db<{ a: number; b: number }>(weird_name);
    db.data.qwq.a = 1;
    db.data.qaq.b = 2;
  }

  // Reregistering should be a no-op, even if two registring is not the same
  mgr.register(weird_name, []);

  {
    using db = await mgr.db<{ a: number; b: number }>(weird_name);
    expect(db.data.qwq).toEqual({ a: 1, b: 1 });
    expect(db.data.qaq).toEqual({ a: 0, b: 2 });
    expect(db.data.unassigned).toEqual({ a: 0, b: 1 });
  }

  {
    using suba = await (await mgr.db('array init test')).sub<string>('a');
    suba.data['a.a'] = 'aa';
  }

  expect(ctnt).toEqual({
    '%-2%-3%-2%-3%-1%-1%-7%-7weird name': [
      { qaq: { a: 0, b: 2 }, qwq: { a: 1, b: 1 }, unassigned: { a: 0, b: 1 } },
      { qaq: { a: 0, b: 2 }, qwq: { a: 1, b: 1 }, unassigned: { a: 0, b: 1 } },
    ],
    'array init test/a': [{ 'a.a': 'aa' }],
  });
});

test('use storage', async () => {
  // TODO: complete the test
});
