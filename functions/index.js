// Anthropic API を代理で呼び出す Firebase Functions(v2 callable)。
// APIキーはサーバー側のシークレット(ANTHROPIC_API_KEY)として1回だけ登録し、
// ブラウザには一切渡さない。ログイン済み(Firebase Auth)のユーザーのみ呼び出せる。
//
// デプロイ手順は functions/README.md を参照。

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = "claude-opus-4-8";

exports.chat = onCall(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" },
  async (request) => {
    // ログイン必須(未ログインの呼び出しは拒否)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }

    const { system, messages, schema } = request.data || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages が不正です。");
    }

    const body = {
      model: MODEL,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system,
      messages,
    };
    if (schema) body.output_config = { format: { type: "json_schema", schema } };

    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new HttpsError("unavailable", "Anthropic API へ接続できませんでした。");
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new HttpsError("internal", `Anthropic error ${res.status}: ${t.slice(0, 300)}`);
    }

    const data = await res.json();
    if (data.stop_reason === "refusal") return { refusal: true, text: "" };
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text };
  }
);
