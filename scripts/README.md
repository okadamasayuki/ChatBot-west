# 管理用スクリプト

## 担当者・財務アカウントの一括作成 (`create-accounts.mjs`)

**担当者(質問のみ)5アカウント + 財務(会計の専門家)3アカウント** を Firebase Authentication に作成し、それぞれの**役割を Firestore に自動登録**します。実行後、各担当者は発行されたメール/パスワードでアプリにログインするだけで、役割まで反映されます。

> ⚠️ このスクリプトは Firebase Admin SDK を使い、**管理者権限(サービスアカウント)** で実行します。信頼できる端末でのみ実行し、`serviceAccountKey.json` は絶対に公開・コミットしないでください(`.gitignore` 済み)。

### 事前準備

1. **サービスアカウントキーを取得**
   - Firebase Console → ⚙ プロジェクトの設定 → **サービス アカウント** → **新しい秘密鍵を生成**
   - ダウンロードした JSON を `scripts/serviceAccountKey.json` として保存
2. **メール/パスワード認証を有効化**(未実施の場合)
   - Firebase Console → Authentication → Sign-in method → メール/パスワードを有効化
3. **Node.js 18 以上** をインストール

### 実行

```bash
cd scripts
npm install
# 合言葉は、アプリの「ワークスペース合言葉」と必ず同じ文字列にすること
WORKSPACE_CODE="あなたの合言葉" node create-accounts.mjs
```

実行すると、作成した8アカウントの **メール / パスワード / 役割** が表形式で出力されます。この情報を各担当者へ配布してください。

### オプション(環境変数)

| 変数 | 既定値 | 説明 |
|---|---|---|
| `WORKSPACE_CODE` | (必須) | アプリの合言葉と同じ文字列。役割の保存先ワークスペースを決定します |
| `EMAIL_DOMAIN` | `example.com` | 作成するメールアドレスのドメイン(実在しなくてもログインには使えます) |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./serviceAccountKey.json` | サービスアカウントキーのパス |

作成されるアカウント(既定):

- 担当者: `tantou1@example.com` 〜 `tantou5@example.com`
- 財務: `zaimu1@example.com` 〜 `zaimu3@example.com`

※ 名前やドメインを変えたい場合は `create-accounts.mjs` の `accounts` 定義、または `EMAIL_DOMAIN` を調整してください。

### 補足

- スクリプトは冪等です。既に存在するメールアドレスはパスワードを再設定し、役割を上書きします。
- 役割は Firestore の `workspaces/{ワークスペースID}/members/{uid}` に `role: "questioner" | "expert"` として保存されます。アプリはログイン時にこれを読み取ります。
