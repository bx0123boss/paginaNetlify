import { neon } from '@netlify/neon';

const sql = neon(); // Usa automáticamente el valor de NETLIFY_DATABASE_URL

export async function handler() {
  try {
    const result = await sql`SELECT codigo FROM codigos ORDER BY RANDOM() LIMIT 1`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: result[0].codigo }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al consultar la DB" }),
    };
  }
}
