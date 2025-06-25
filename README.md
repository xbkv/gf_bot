## 動作環境

- Node.js v22.5.1
- Arch LinuxとCentOS Stream 9で動作確認済み

## セットアップ手順

各種依存性のインストールは以下のコマンドで行います。以下、パッケージマネージャーには標準搭載のnpmを使用いたしますが、その他のパッケージマネージャー(Yarnやpnpm)などでも同様の手順で利用できます。

```
npm install
```

本Botではdiscord.jsの高速化やデータベース機能のため、ネイティブモジュールのビルドが必要なライブラリを導入しています。(詳細は[こちら](https://github.com/discordjs/discord.js/tree/main/packages/discord.js#optional-packages))

- zlib-sync
- bufferutil
- utf-8-validate
- sodium-naive
- better-sqlite3

上記ライブラリのインストール中、一部のNode.js環境(特にWindows)ではビルドに失敗することがあります。
Windows環境でこれらのライブラリがビルドできない場合は、Node.jsを一度アンインストールし、再インストール時に途中の"Tools for Native Modules"というページで"Automatically install the necessary tools ~"にチェックを入れてインストールすることで解決できます。

## config.jsonについて

BotのクライアントIDとトークンはconfig.jsonに記載してください。Botアカウントの方は用意しておりませんので、ご自身でDiscordのDeveloper Portalsより作成の方をお願いいたします。

guildIdsには参加中のすべてのサーバーのIDが自動で記入されます。通常はこちらを手動で設定していただく必要はございません。

mongodbUriとmongodbNameにはMongoDBのURLとDB名が記載されています。あらかじめ、ご自身の環境に合わせて変更をお願いいたします。

charactersDbPathとmetaCardsDbPathには、カードの元となるキャラクター定義と取引系・ツールカードの定義ファイル(characters.jsonとmeta_cards.json)へのファイルパスが記載されています。

## assetsフォルダについて

assetsフォルダにはフォントやフォールバック画像などのアセットが含まれています。
また、取引系・ツールカードの定義ファイル(meta_cards.json)も含まれておりますが、iconUrlとcardFilePathが空となっておりますので、こちらはりなぺん様の方で設定をお願いいたします。

## コマンド一覧

- `npm run deploy`: 現在参加中のすべてのサーバーにスラッシュコマンドを登録します。コマンドが登録されない場合は、Botを再起動の上もう一度実行してください。
- `npm run dev`: Botを実行します。(開発用)
- `npm run start`: Botをバックグラウンドで実行します。(pm2というプロセスマネージャーのインストールが必要です)
- `npm run stop`: バックグラウンドで実行中のBotを停止します。(pm2というプロセスマネージャーのインストールが必要です)
