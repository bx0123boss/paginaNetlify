import { neon } from '@netlify/neon';
import Stripe from 'stripe';

const sql = neon();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing session_id' }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Payment not completed' }),
      };
    }

    // Obtener un código libre
    const result = await sql`
      SELECT codigo FROM codigos WHERE usado = false ORDER BY RANDOM() LIMIT 1;
    `;
    const codigo = result[0]?.codigo;

    if (!codigo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No hay códigos disponibles' }),
      };
    }

    // Marcar como usado
    await sql`
      UPDATE codigos SET usado = true, fecha_uso = NOW() WHERE codigo = ${codigo};
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ codigo }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
