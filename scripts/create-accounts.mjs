// 担当者・財務アカウントを一括作成し、役割(role)を Firestore に登録するスクリプト。
// Firebase Admin SDK を使用します(サーバー/ローカルで実行。Firestoreルールはバイパスされます)。
//
// 使い方は scripts/README.md を参照。
//
//   WORKSPACE_CODE="アプリの合言葉" node create-accounts.mjs
//
import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

// ===== 設定(環境変数で上書き可) =====
const WORKSPACE_CODE = process.env.WORKSPACE_CODE || "";           // アプリの「ワークスペース合言葉」と同一にすること
const EMAIL_DOMAIN   = process.env.EMAIL_DOMAIN   || "example.com"; // アカウントのメールドメイン(実在不要・識別子として使用)
const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

// 作成するアカウント: 担当者(questioner)5, 財務(expert)3
const accounts = [
  ...Array.from({ length: 5 }, (_, i) => ({ email: `tantou${i + 1}@${EMAIL_DOMAIN}`, role: "questioner" })),
  ...Array.from({ length: 3 }, (_, i) => ({ email: `zaimu${i + 1}@${EMAIL_DOMAIN}`,  role: "expert" })),
];

if (!WORKSPACE_CODE) {
  console.error("エラー: 環境変数 WORKSPACE_CODE を設定してください(アプリで使う合言葉と同じ文字列)。");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf8"));
} catch (e) {
  console.error(`エラー: サービスアカウントキーを読み込めません (${SERVICE_ACCOUNT})。`);
  console.error("Firebase コンソール → プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成 で取得し、serviceAccountKey.json として保存してください。");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

// ワークスペースID = 合言葉の SHA-256(アプリと同じ算出方法)
const wid = createHash("sha256").update(WORKSPACE_CODE).digest("hex");

function genPassword() {
  // 記号なしで扱いやすい12文字
  return randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

const results = [];
for (const a of accounts) {
  const password = genPassword();
  let user;
  try {
    user = await auth.createUser({ email: a.email, password, emailVerified: false });
    console.log(`作成: ${a.email}`);
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      user = await auth.getUserByEmail(a.email);
      await auth.updateUser(user.uid, { password });
      console.log(`更新(既存): ${a.email}`);
    } else {
      console.error(`失敗: ${a.email} - ${e.message}`);
      continue;
    }
  }
  // 役割を Firestore に登録(アプリはログイン時にこれを読み取る)
  await db.doc(`workspaces/${wid}/members/${user.uid}`).set(
    { email: a.email, role: a.role, createdAt: new Date().toISOString() },
    { merge: true }
  );
  results.push({ メール: a.email, パスワード: password, 役割: a.role === "expert" ? "財務" : "担当者" });
}

console.log("\n=== 作成したアカウント(このパスワードを各担当者へ配布してください) ===");
console.table(results);
console.log(`\nワークスペースID (Firestore): workspaces/${wid}`);
console.log("各担当者はアプリを開き、設定でFirebase設定と同じ合言葉を入力 → 上記メール/パスワードでログインしてください(役割は自動反映されます)。");

process.exit(0);
