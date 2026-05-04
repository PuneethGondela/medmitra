import pool from "./config/db";

const run = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      console.error("Ad-hoc queries are disabled in production environment");
      process.exit(1);
    }

    // Read query from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const query = Buffer.concat(chunks).toString("utf8").trim();

    if (!query) {
      console.error("No query provided");
      process.exit(1);
    }

    const normalizedQuery = query.toLowerCase();
    if (!normalizedQuery.startsWith("select ")) {
      console.error("Security Error: Only SELECT queries are permitted");
      process.exit(1);
    }

    if (normalizedQuery.includes(";")) {
      console.error("Security Error: Multiple statements are not permitted");
      process.exit(1);
    }

    console.log("Running Query:", query);
    const res = await pool.query(query);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
