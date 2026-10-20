const { MongoClient } = require("mongodb");

// Reuse the connection between requests (important on serverless).
let clientPromise;
function getCollection() {
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  return clientPromise.then((c) =>
    c.db(process.env.DB_NAME || "astronomy").collection("constellations")
  );
}

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};
const send = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Only GET is allowed" });

  const path = event.path.replace(/^\/(\.netlify\/functions\/)?api/, "").replace(/\/$/, "");
  const q = event.queryStringParameters || {};
  const projection = { _id: 0 };

  try {
    // GET /api
    if (path === "") {
      return send(200, { endpoints: ["/api/constellations", "/api/constellations/:abbr"] });
    }

    const col = await getCollection();

    // GET /api/constellations?hemisphere=southern&zodiac=true&limit=20&skip=0
    if (path === "/constellations") {
      const filter = {};
      if (q.hemisphere) {
        if (!["northern", "southern"].includes(q.hemisphere))
          return send(400, { error: "hemisphere must be northern or southern" });
        filter.primary_hemisphere = q.hemisphere;
      }
      if (q.zodiac) {
        if (!["true", "false"].includes(q.zodiac))
          return send(400, { error: "zodiac must be true or false" });
        filter.zodiac = q.zodiac === "true";
      }
      const limit = Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 100);
      const skip = Math.max(parseInt(q.skip, 10) || 0, 0);
      const results = await col.find(filter, { projection }).sort({ name: 1 }).skip(skip).limit(limit).toArray();
      return send(200, { count: results.length, results });
    }

    // GET /api/constellations/Ori
    const m = path.match(/^\/constellations\/([A-Za-z]{3})$/);
    if (m) {
      const doc = await col.findOne(
        { abbreviation: m[1] },
        { projection, collation: { locale: "en", strength: 2 } }
      );
      return doc ? send(200, doc) : send(404, { error: "Not found" });
    }

    return send(404, { error: "Unknown route" });
  } catch (err) {
    console.error(err);
    return send(500, { error: "Server error" });
  }
};
