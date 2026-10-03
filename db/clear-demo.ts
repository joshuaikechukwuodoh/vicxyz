import "dotenv/config";
import { clearDemoCatalog } from "../services/demo-catalog";
import { getDb } from "./index";
async function main() {
  try {
    const result = await clearDemoCatalog();
    console.log(
      `Removed ${result.removed} demo listings; skipped ${result.skipped} listings in active confirmed orders. Real uploads and order snapshots were preserved.`,
    );
  } finally {
    await getDb().$client.end();
  }
}
main().catch(() => {
  console.error(
    "Demo cleanup failed. Check database connectivity and migrations.",
  );
  process.exitCode = 1;
});
