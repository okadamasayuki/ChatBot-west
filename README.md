# 会計相談チャット

LINE風のチャットUIで会計に関する質問ができるWebアプリです。Claude(AI)が質問に回答し、AIで回答できない質問は財務(BA=ビジネスアドバイザー)にエスカレーションされます。単一の `index.html` で動く静的アプリで、データはFirebase(Firestore)、AI呼び出しはFirebase Functionsのプロキシ経由です。

> **iOS版を開発する場合**: 同じFirebaseプロジェクト・同じFirestoreデータモデル・同じFunctionsプロキシをそのまま使えます。「[データモデル](#データモデルfirestore)」「[AI連携](#ai連携)」「[iOS版開発メモ](#ios版開発メモ)」を参照してください。

## 全体像

- **利用者(役割)は2種類** — アカウント登録時に選択し、`members/{uid}` に保存
  - **担当者(questioner)**: 質問する人。「質問者」タブのみ
  - **財務(expert)**: 回答する人(BA)。「相談一覧」「BA」「社内ルール」「マニュアル」タブ
- **ログイン必須**(Firebase Authentication・メール+パスワード)。最初に「ログイン or 新規登録」を選ぶ2段階の画面。新規登録時にニックネームを入力(表示名として使用)
- **AIの回答は3分岐**(構造化出力で判定): 即回答(answer) / 聞き返し(clarify・選択肢ボタン付き) / エスカレーション(escalate・BAの回答方針の選択肢を自動生成)
- **社内ルール・マニュアル・回答の癖**をプロンプトに差し込んで回答品質を制御

## 機能一覧

### 相談(チャット)
- 💬 相談ごとのトークルーム。「＋ 新規」で作成(最初のメッセージ送信まで保存されない)
- 🗂 担当者は「自分の相談 / 全員の相談」を切替。**自分の相談以外には入力できない**(閲覧のみ)。財務は常に全件表示で入力不可(回答はBAタブから)
- 🏷 一覧のステータスバッジ: **✓ 完了**(緑) / **BA回答待ち**(橙・エスカレーション中) / **担当者回答待ち**(青・それ以外)
- ✅ **完了はチャット内で切替**(上部バーの「完了にする / ✓ 完了」。財務と相談の本人のみ)。完了した相談の案件はBAタブ・バッジから消える(取り消しで戻る)
- 🔀 一覧の並び替えチップ: **新しい順 / ステータス順**(選択は端末に保存)
- ☑️ 財務: 一覧のチェックボックスで複数の相談を選択 → 「📋 社内ルールを更新」で**まとめて差分抽出**
- ↤ 自分の相談は左スワイプで削除(財務は削除不可)
- 👆 チャット内のスワイプ: **右=相談一覧へ / 左=BAの該当案件へ**(指に追従して真横に動く)。ブラウザの「戻る」でも一覧へ戻れる(History API)
- 🕒 メッセージの時刻は「月/日 時:分」表示。他人の相談では相談者名も表示

### AI回答
- 🤖 一般的な会計知識で答えられる質問は即回答
- ❓ 情報不足時は短い聞き返し+タップで答えられる選択肢ボタン
- 👤 個別判断が必要な質問はエスカレーション(質問者には「BAにおつなぎしました」と自動返信)

### BAタブ(財務のみ)
- 📥 エスカレーション案件の一覧。バッジに未回答件数
- 🧑‍🔧 **対応者(ステータスラベル)**: 「要対応」をタップで自分が対応者に(もう一度で解除)。「対応中:名前 / ✓ 対応済み:名前」を表示
- 🔒 **自分が対応中の案件だけ**回答方針を選択・回答文の作成・送信ができる(それ以外はロック。案内は一覧先頭に1回表示)
- ✍️ 回答方針(AI提案の選択肢 or 自由入力・音声入力)→「回答文(案)を作成」→ 編集 →「OK — 質問者に送信」
- 📌 送信後もタブを離れるまで案件は同じ位置に表示(タブを離れて戻ると未回答が上・対応済みが下の通常順)
- 📖 「マニュアルの該当箇所を確認」: AIが各選択肢とマニュアルを照合し、記載がある選択肢の下に「📖 マニュアル名: 引用」を表示(結果は案件に保存され全員に共有)
- 🔗 件名タップで元の相談を開く/チャットの「BAで見る」ボタン・左スワイプで該当案件へ(ハイライト表示)

### 社内ルール(財務のみ)
- 📘 ワークスペース共通の1つのテキスト。タブでは閲覧のみ+「🧹 コンパクト」(AIが重複統合・整理 → 確認して置き換え)
- 📋 **相談からの更新**: 相談一覧で複数選択 → モーダルが開き**既存ルールとの差分(不足分)を自動抽出** → 確認・編集して「社内ルールに追加」
- 📄 **マニュアルからの抽出**: マニュアルタブ(全マニュアル一括)/プレビュー画面(1冊)から同じ方式で差分抽出。**生成AIが一般知識で答えられる内容は除外**し、社内固有のルールだけを対象にする
- 🗑 「社内ルールを空にする」は設定画面(財務のみ・確認ダイアログ付き)

### マニュアル(財務のみ)
- 📄 PDF / テキスト / Markdown をファイル選択で追加。PDFは pdf.js(4.2.67 + 日本語cMap)で本文を抽出
- 👀 ファイル名タップでプレビュー(PDFは元ファイルをcanvas描画。元PDFは約600KB以下ならFirestoreに保存)
- 🗑 ファイル名と同じ行のゴミ箱で削除
- AIは回答時にマニュアル本文(最大8,000字)を参照

### 設定
- 👤 ログイン情報表示・ログアウト
- 🧪 「サンプル相談を追加(デモ)」: サンプル15件(AI回答5・エスカレーション中6・BA回答済み4)を追加。既存なら**正規状態にリセット**(重複メッセージ削除・時刻修復・案件と完了状態の初期化)
- 📄 サンプルマニュアル8冊をワンタップ追加(サンプル相談15件すべてに根拠が対応): 経費精算 / 固定資産管理 / 交際費・会議費 / インボイス・消費税 / 給与・社会保険 / 売上計上 / 債権管理 / 外貨建取引
- 💬 「相談をすべて削除」(財務のみ・確認2回): 全ルーム・メッセージ・案件・回答履歴を削除
- ✍️ **回答の癖(回答スタイル)**: アカウントごとの設定(`members/{uid}.answerStyle`)。自分がAIに回答文を作らせるときに文体・構成を従わせる
- ⬇️ ヘッダーからQ&A履歴をJSON / CSV(BOM付きUTF-8)でダウンロード

## データモデル(Firestore)

ワークスペースID `wid` は、アプリに埋め込まれた合言葉(`WORKSPACE_CODE`)の **SHA-256ハッシュ**。すべて `workspaces/{wid}` 配下に保存する。時刻はすべて **ISO 8601文字列**。

```
workspaces/{wid}                     … { naiki: string }  ← 社内ルール本文(チーム共通)
workspaces/{wid}/members/{uid}       … { email, role: "questioner"|"expert",
                                         nickname, createdAt, answerStyle? }
workspaces/{wid}/rooms/{roomId}      … { id, title, createdAt, lastText, lastTs,
                                         ownerUid, ownerEmail, ownerName?,
                                         status?: "" | "done" }
workspaces/{wid}/rooms/{roomId}/messages/{msgId}
                                     … { id, role: "user"|"ai"|"expert"|"system",
                                         text, ts, clarifyOptions?: string[] }
workspaces/{wid}/cases/{caseId}      … { id, roomId, question, reason,
                                         options: string[], selectedOption: number|null,
                                         draft: string|null,
                                         status: "pending"|"drafted"|"answered",
                                         answer?, askedAt, answeredAt?,
                                         handledBy?: string,   ← 対応者の表示名
                                         manualRefs?: [{ option, manual, excerpt }] }
workspaces/{wid}/manuals/{manualId}  … { id, title, content, updatedAt,
                                         pdfData?: string(base64, ≦約600KB) }
workspaces/{wid}/qa/{autoId}         … { question, answered_by: "AI"|"BA", handler?,
                                         selected_option?, answer, asked_at, answered_at }
```

実装上の注意:
- ルーム一覧の購読は `orderBy` を付けず全件取得し、**クライアント側で並び替える**(フィールド欠落ドキュメントの黙った除外を防ぐ)。`cases` は `orderBy("askedAt")`、`manuals` は `orderBy("updatedAt")`、`messages` は `orderBy("ts")`、`qa` は `orderBy("answered_at")`
- `lastText` が空のルームは一覧に表示しない(未送信の下書きの残骸)
- ステータスの導出: `room.status === "done"` → 完了 / そのルームに `status !== "answered"` の案件あり → BA回答待ち / それ以外 → 担当者回答待ち
- サンプルデータは固定ID(`ex1`〜`ex15`、メッセージ `ex1u/ex1a/ex1e` 形式、案件 `cex5` 形式、サンプルマニュアル `sample-manual-{slug}`)
- 役割・回答の癖はログイン時に `members/{uid}` から読む(リアルタイム購読ではない)

### セキュリティルール(現行)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{wid}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- アクセス制御は「①Authenticationのログイン ②合言葉のハッシュを知っていること」の二段構え
- `firebaseConfig`(apiKey等)は公開情報。**秘密は合言葉とサーバー側のAnthropic APIキーのみ**

## AI連携

ブラウザからAnthropic APIを直接呼ばず、**Firebase Functions v2 の callable 関数 `chat`**(リージョン `us-central1`)を経由する。APIキーはサーバー側シークレット `ANTHROPIC_API_KEY` に1回だけ登録(手順は `functions/README.md`)。

- 呼び出し: `httpsCallable(functions, "chat")({ system, messages, schema? })` → `{ text }` を返す(ログイン必須。未ログインは拒否)
- モデル: `claude-opus-4-8`、`max_tokens: 8192`、`thinking: adaptive`
- `schema` を渡すと構造化出力(`output_config.format = json_schema`)になり、`text` にJSON文字列が返る

アプリ内のプロンプト(すべて `index.html` に定数として定義):

| 定数 | 用途 | 構造化出力 |
|---|---|---|
| `TRIAGE_SYSTEM` + `TRIAGE_SCHEMA` | 質問の振り分け(answer/clarify/escalate、聞き返し選択肢、BA向け回答方針の生成) | ○ |
| `DRAFT_SYSTEM` | BAの回答文(案)の生成 | − |
| `NAIKI_SUGGEST_SYSTEM` | 相談からの社内ルール差分抽出 | − |
| `NAIKI_EXTRACT_SYSTEM` | マニュアルからの社内ルール抽出(AIが自力で答えられる一般知識は除外) | − |
| `NAIKI_COMPACT_SYSTEM` | 社内ルールの整理(コンパクト) | − |
| `MANUAL_REF_SYSTEM` + `MANUAL_REF_SCHEMA` | 選択肢ごとのマニュアル該当箇所の照合 | ○ |

`withNaiki(base)` がシステムプロンプトに以下を追記する(TRIAGEとDRAFTで使用):
1. 【当事務所の社内ルール】(`workspaces/{wid}.naiki`。一般知識より優先させる指示付き)
2. 【社内マニュアル】(全マニュアル連結・最大8,000字)
3. 【回答の癖(回答スタイル)】(ログイン中アカウントの `answerStyle`)

## アーキテクチャ(Web版)

- ビルド不要の**単一 `index.html`**(CSS/JSインライン)。GitHub Pagesでホスティング
- Firebase JS SDK v10.12.2 をCDNから動的import(app / auth / firestore / functions)
- pdf.js 4.2.67(jsDelivr、日本語用cMap同梱設定)でPDF本文抽出・プレビュー描画
- `FIREBASE_CONFIG` と `WORKSPACE_CODE`(合言葉)は `index.html` に埋め込み
- リアルタイム同期: `onSnapshot`(rooms / cases / manuals / qa / workspace文書)
- 端末保存(localStorage): アクティブタブ、並び替え、ローカルキャッシュ(`state`)
- iPhoneの入力時自動ズーム対策として、タッチ端末では入力系のfont-sizeを16pxに強制

## セットアップ(Firebase)

1. Firebase Console でプロジェクト作成 → **Firestore** 有効化 → 上記セキュリティルールを設定
2. **Authentication** → メール/パスワードを有効化(ユーザーはアプリの新規登録 or コンソールから発行)
3. プロジェクト設定 → ウェブアプリを追加 → `firebaseConfig` を `index.html` の `FIREBASE_CONFIG` に埋め込み(本リポジトリは設定済み)
4. AIプロキシのデプロイ(要Blazeプラン): `functions/README.md` の手順で `ANTHROPIC_API_KEY` を登録し `firebase deploy --only functions`

## デプロイ(Web版)

`main` ブランチへのpushで GitHub Actions が GitHub Pages に自動デプロイ(`.github/workflows/deploy-pages.yml`)。GitHub Pagesのキャッシュは最大10分程度。

## iOS版開発メモ

- **再利用できるもの**: Firebaseプロジェクト / Firestoreのデータモデル(上記) / Functionsの `chat` callable / 各プロンプト定数(`index.html` からコピー) / セキュリティルール
- iOSからは Firebase iOS SDK(Auth・Firestore・Functions)で同じデータに接続できる。`wid` は合言葉のSHA-256を同じ計算で求めること
- 時刻はISO文字列で保存されているため、`Date` との相互変換に注意(FirestoreのTimestamp型ではない)
- `chat` callable はログイン済みユーザーのみ呼び出せる。`schema` を渡すとJSON文字列が返るのでデコードして使う
- PDFの本文抽出はWeb版ではpdf.jsで実施している。iOS版では PDFKit の `string` 抽出などで代替し、`content`(抽出テキスト)と `pdfData`(base64)を同じ形式で保存すればWeb版とプレビュー互換になる
- Web版のジェスチャー対応(右スワイプ=一覧 / 左スワイプ=BAの該当案件、ブラウザ戻る対応)はiOSではネイティブのナビゲーションで置き換えてよい

## 注意事項

- AIの回答は一般的な情報提供であり、税理士・公認会計士による助言に代わるものではありません
- 1つのワークスペースのデータ(相談・社内ルール・案件・マニュアル)はログイン済みメンバー全員で共有されます
- `serviceAccountKey.json` などの秘密情報は絶対にコミットしないこと(`.gitignore` 設定済み)
