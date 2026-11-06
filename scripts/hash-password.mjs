// Genera el hash PBKDF2 de la contraseña del admin (formato que entiende lib/server.ts).
// Uso:   npm run --silent hash-password | npx wrangler secret put ADMIN_PASSWORD_HASH
// La contraseña se pide por consola (o por la variable ADMIN_PASSWORD) y nunca se guarda.
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline";

const ITER = 100000; // máximo admitido por PBKDF2 en Cloudflare Workers
const b64url = (b) => Buffer.from(b).toString("base64url");

async function ask() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  rl._writeToOutput = () => {}; // no mostrar lo que se escribe
  process.stderr.write("Contraseña del admin (mín. 12 caracteres): ");
  const pw = await new Promise((r) => rl.question("", r));
  rl.close();
  process.stderr.write("\n");
  return pw;
}

const pw = await ask();
if (!pw || pw.length < 12) { console.error("La contraseña debe tener al menos 12 caracteres."); process.exit(1); }
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
process.stdout.write(`pbkdf2-sha256$${ITER}$${b64url(salt)}$${b64url(bits)}`);
