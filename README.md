# Linquebot_v2

![build status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/build_check.yml/badge.svg)
![doc status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/tsdoc.yml/badge.svg)
![lint status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/lint_check.yml/badge.svg)

## How to use

复制 `config.example.yml` 到 `config.yml`

```
cp config.example.yml config.yml
```

接下来，按 `config.example.yml` 的说明配置 `config.yml`

最后，启动

```
npm run build
npm run start
```

## Develop Plugin

[Api referances](https://lhcfl.github.io/Linquebot_v2/)

Linquebot的基本组成部分是 Plugin。每个 Plugin 单独在 `src/plugins/` 下有一个文件夹。

每个 Plugin 必须有一个 `index.js` （或 `index.ts` 然后编译） `export` 一个 `PluginInit` 类型的 `init`。

下面是一个 Plugin 的 `index.ts` 的模板：

```typescript
import { commandHandleFunction } from '@/lib/command.js';
import { PluginInit } from '@/types/plugin.js';

const sayHello: commandHandleFunction = (app, msg) => {
  app.bot.sendMessage(msg.chat.id, 'hello, world!');
};

const init: PluginInit = (app) => {
  console.log('plugin loaded!');
  app.registCommand({
    command: 'hellp',
    chat_type: 'all',
    description: 'say hello',
    handle: sayHello,
  });
};

export { init };
```
