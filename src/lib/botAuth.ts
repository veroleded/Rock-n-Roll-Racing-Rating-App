import { createHmac } from "crypto";

// Функция для создания подписи
export function createSignature(timestamp: string, body: string = ""): string {
  const hmac = createHmac("sha256", process.env.BOT_SECRET_KEY || "");
  return hmac.update(`${timestamp}.${body}`).digest("hex");
}

// Функция для проверки подписи
export function verifyBotRequest(request: Request): boolean {
  try {
    const timestamp = request.headers.get("X-Bot-Timestamp");
    const signature = request.headers.get("X-Bot-Signature");

    if (!timestamp || !signature) {
      return false;
    }

    // Проверяем актуальность timestamp (5 минут)
    const timestampMs = parseInt(timestamp);
    if (isNaN(timestampMs) || Date.now() - timestampMs > 5 * 60 * 1000) {
      return false;
    }

    // Для GET-запросов тело пустое
    const body = request.method === "GET" ? "" : JSON.stringify(request.body);
    const expectedSignature = createSignature(timestamp, body);

    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying bot request:", error);
    return false;
  }
}
