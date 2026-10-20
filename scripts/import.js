// Run once from your computer: npm run import
// Needs a MongoDB user that CAN write (not the read-only one).
const { MongoClient } = require("mongodb");
const data = require("./constellations.json");

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db(process.env.DB_NAME || "astronomy").collection("constellations");
  await col.deleteMany({});
  await col.insertMany(data.constellations);
  await col.createIndex({ abbreviation: 1 }, { unique: true });
  await col.createIndex({ primary_hemisphere: 1 });
  console.log(`Imported ${data.constellations.length} constellations`);
  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
