const { Pool } = require('pg');

exports.handler = async () => {
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT codigo FROM codigos ORDER BY RANDOM() LIMIT 1'
    );
    client.release();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: result.rows[0].codigo }),
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Error al consultar la DB" }) 
    };
  }
};