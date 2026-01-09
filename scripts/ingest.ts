import "dotenv/config";
import { ingestAll } from "@/lib/ingest";

async function main() {
  const stats = await ingestAll();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
