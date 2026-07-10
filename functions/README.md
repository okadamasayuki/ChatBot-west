# API プロキシ(Firebase Functions)

Anthropic の API キーを**サーバー側に1回だけ登録**し、ブラウザには一切渡さない構成です。ログイン済み(Firebase Authentication)のユーザーだけが、この関数経由で Claude を呼び出せます。各利用者が API キーを入力する必要はなくなります。

`chat` という callable 関数を提供し、アプリ(`index.html`)はログイン中に自動でこの関数を呼び出します(APIキー欄は空欄でOK)。

## 前提

- Firebase プロジェクト作成済み・アプリが接続済み(README のチーム共有セットアップ参照)
- **Blaze(従量課金)プラン**が必要です(Cloud Functions の要件)。少人数運用なら無料枠にほぼ収まります
- Node.js 20 / [Firebase CLI](https://firebase.google.com/docs/cli)

## デプロイ手順

```bash
# 1. Firebase CLI を用意(未インストールなら)
npm install -g firebase-tools
firebase login

# 2. プロジェクトを紐付け(リポジトリのルートで)
firebase use chatbotwest-5b568

# 3. 依存関係をインストール
cd functions && npm install && cd ..

# 4. Anthropic API キーをシークレットとして登録(1回だけ)
firebase functions:secrets:set ANTHROPIC_API_KEY
#   → プロンプトに sk-ant-... を貼り付けて Enter

# 5. デプロイ
firebase deploy --only functions
```

デプロイ後、アプリにログインすればAPIキー入力なしで質問できます。関数はログイン済みユーザーのみ実行可能で、キーはサーバー内のシークレットからのみ参照されます。

## 補足

- 関数リージョンは `us-central1`(既定)。変更する場合は `functions/index.js` の `region` とアプリ側 `getFunctions(app, "<region>")` を合わせてください。
- キーを更新するには `firebase functions:secrets:set ANTHROPIC_API_KEY` を再実行し、再デプロイします。
- 未デプロイでも、各利用者が設定でAPIキーを入力すれば従来どおり動作します(フォールバック)。
- モデルは `functions/index.js` の `MODEL`(既定 `claude-opus-4-8`)で変更できます。
