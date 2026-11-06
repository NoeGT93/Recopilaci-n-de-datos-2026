import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas las páginas leen D1 en cada visita: no se usa caché incremental.
export default defineCloudflareConfig({});
