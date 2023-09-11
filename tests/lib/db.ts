Object.defineProperty(Symbol, 'dispose', {
  value: '@@dispose',
});
Object.defineProperty(Symbol, 'asyncDispose', {
  value: '@@asyncDispose',
});

import { DBManager } from '../../src/lib/newdb.js';
import fs from 'fs/promises';

type RegType = { [k: string]: { [pk: string | number]: unknown }[] };

test('simple data', async () => {
  console.warn = jest.fn();
  const ctnt: RegType = {};
  const mgr = new DBManager({
    async read(name: string) {
      return Promise.resolve(name in ctnt ? ctnt[name][ctnt[name].length - 1] : {});
    },
    write(name: string, data: { [k: string | number]: unknown }) {
      if (!(name in ctnt)) ctnt[name] = [];
      ctnt[name].push(structuredClone(data));
    },
  });
  await expect(mgr.db('a')).rejects.toThrow(new Error('Unregistered database: a'));
  const weird_name = '*?*?//\\\\weird name';
  const supinit = () => ({ a: 0, b: 1 });
  const subinit = () => 'sub';

  mgr.register(weird_name, { data: supinit, sub: { data: subinit } });
  // Expect array-form and initializer-form initializing to be the same
  mgr.register('array init test', [supinit, subinit]);
  // (To access the fake-privated field x (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = (mgr as unknown as { registry: { [k: string | number]: unknown } }).registry;
  expect(reg[weird_name]).toEqual(reg['array init test']);

  {
    await using db = await mgr.db<{ a: number; b: number }>(weird_name);
    db.data.qwq.a = 1;
    db.data.qaq.b = 2;
  }

  // Reregistering should be a no-op, even if two registring is not the same
  mgr.register(weird_name, []);

  {
    await using db = await mgr.db<{ a: number; b: number }>(weird_name);
    expect(db.data.qwq).toEqual({ a: 1, b: 1 });
    expect(db.data.qaq).toEqual({ a: 0, b: 2 });
    expect(db.data.unassigned).toEqual({ a: 0, b: 1 });
  }

  {
    await using suba = await (await mgr.db('array init test')).sub<string>('a');
    suba.data['a.a'] = 'aa';
  }
  {
    await using subb = await (await mgr.db('array init test')).sub<string>('b');
    expect(subb.data['a.a']).toBe('sub');
    subb.data['a.a'] = 'subb entry';
  }

  await expect(mgr.with_path(['array init test'], () => {})).rejects.toEqual(
    new Error('with_path should be called with a path longer than 2')
  );
  expect(
    await mgr.with_path<string>(['array init test', 'b', 'a.a'], (val) => {
      expect(val).toBe('subb entry');
      return 'with path';
    })
  ).toBe('with path');
  expect(
    await mgr.with_path<string>(['array init test', 'b', 'a.a'], (val) => {
      expect(val).toBe('with path');
    })
  ).toBe(undefined);

  expect(ctnt).toEqual({
    '%-2%-3%-2%-3%-1%-1%-7%-7weird name': [
      { qaq: { a: 0, b: 2 }, qwq: { a: 1, b: 1 } },
      { qaq: { a: 0, b: 2 }, qwq: { a: 1, b: 1 }, unassigned: { a: 0, b: 1 } },
    ],
    'array init test/a': [{ 'a.a': 'aa' }],
    'array init test/b': [{ 'a.a': 'subb entry' }, { 'a.a': 'with path' }, { 'a.a': 'with path' }],
  });
  expect(console.warn).not.toBeCalled();
});

test('racing warning', async () => {
  console.warn = jest.fn();
  console.trace = jest.fn(); // No, I don't want to see any stacktraces
  const mgr = new DBManager({
    read: () => ({}),
    write: () => {},
  });
  mgr.register('racing', [() => 'race']);
  {
    await using db1 = await mgr.db<string>('racing');
    await using db2 = await mgr.db<string>('racing');
    expect(db1.data.a).toBe('race');
    expect(db2.data.a).toBe('race');
    db1.data.a = 'db1 assign';
    expect(db1.data.a).toBe('db1 assign');
    expect(db2.data.a).toBe('race');
    expect(db1.data.b).toBe('race');
    expect(db2.data.b).toBe('race');
    db2.data.b = 'db2 assign';
    expect(db1.data.b).toBe('race');
    expect(db2.data.b).toBe('db2 assign');
  }
  const errmsg = (name: string) =>
    `Database element ${name} in path racing is read while another transaction is using:` +
    'this may be errorneous and would result in data loss.';
  expect((console.warn as jest.Mock).mock.calls).toEqual([[errmsg('a')], [errmsg('b')]]);
  console.warn = jest.fn();
  expect(console.warn).not.toHaveBeenCalled();
  {
    await using db = await mgr.db<string>('racing');
    expect(db.data.a).toBe('db1 assign');
    expect(db.peek.a).toBe('db1 assign');
    // Note that db2's write to b loses because db1 writes its (default) value after db2
    expect(db.peek.b).toBe('race');
    expect(db.peek.c).toBe('race');
  }
  expect(console.warn).not.toHaveBeenCalled();
});

jest.mock('fs/promises', () => {
  const ctnt = {
    access: (name: string) =>
      new Promise<void>((res, rej) => {
        if (name === '../data/main/data.json') res();
        else rej();
      }),
    readFile(name: string) {
      return name === '../data/main/data.json' ? '{ "a": "ita" }' : '';
    },
    writeFile: jest.fn(),
    mkdir(name: string) {
      expect(name).toMatch(/..\/data\/main(\/sub)?/);
    },
    copyFile: jest.fn(),
    rm: jest.fn(),
    constants: { R_OK: 0 },
    __esModule: true,
  };
  return new Proxy(
    { ...ctnt, default: ctnt },
    {
      get(target: { [k: string]: unknown }, name: string) {
        if (name in target) return target[name];
        else throw `${name} not mocked`;
      },
    }
  );
});

test('use storage', async () => {
  const mgr = new DBManager();
  mgr.register('main', [() => 'main', () => 'sub']);
  {
    await using db = await mgr.db<string>('main');
    expect(db.data.a).toBe('ita');
    expect(db.data.b).toBe('main');
    db.data.b = 'qwq';
    expect(db.data.b).toBe('qwq');
    await using sub = await db.sub<string>('sub');
    expect(sub.data.a).toBe('sub');
  }
  expect((fs.writeFile as jest.Mock).mock.calls).toEqual([
    ['../data/main/sub/data.json-writing', ''],
    ['../data/main/sub/data.json', '{"a":"sub"}'],
    ['../data/main/data.json-writing', ''],
    ['../data/main/data.json', '{"a":"ita","b":"qwq"}'],
  ]);
});
