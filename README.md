# Linquebot_v2

![build status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/build_check.yml/badge.svg)
![doc status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/tsdoc.yml/badge.svg)
![lint status](https://github.com/Lhcfl/Linquebot_v2/actions/workflows/lint_check.yml/badge.svg)

## How to use

### Dev Install 开发者安装

适用于希望对该bot做出开发，或者可能改动代码的人员

复制 `config.example.yml` 到 `config.yml`

```
cp config.example.yml config.yml
```

接下来，按 `config.example.yml` 的说明配置 `config.yml`

安装依赖（包括devDependences）

```
npm install
```

安装其他依赖见 User Install部分

最后，启动

```
npm run build
npm run start
```

### User Install 用户安装

适用于不希望对该bot做出改动，直接上手的人员

创建一个文件夹容纳该bot （注意：bot会将数据文件存放在该文件夹的data子文件夹）

```
mkdir linquebot2

cd linquebot2

git clone https://github.com/Lhcfl/Linquebot_v2 -b build

cp Linquebot_v2/config.example.yml ./config.yml
```

配置 `config.yml`

安装依赖

```
npm install --omit=dev

```

安装其他依赖：

- **waife模块**：

  - Graphviz:
    ```
    sudo apt install graphviz -y
    ```
  - 全字体：
    ```
    sudo apt install -y --force-yes --no-install-recommends fonts-noto fonts-noto-cjk fonts-noto-cjk-extra fonts-noto-color-emoji ttf-ancient-fonts
    ```

启动

```
cd Linquebot_v2
npm run run
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
