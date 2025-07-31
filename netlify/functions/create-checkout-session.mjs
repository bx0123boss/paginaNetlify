import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Mapeo de planes a price_ids de Stripe
const PLAN_PRICES = {
  "1 Hora": process.env.STRIPE_PRICE_1HORA,
  "24 Horas": process.env.STRIPE_PRICE_24HORAS,
  "5 Días": process.env.STRIPE_PRICE_5DIAS,
  "1 Semana": process.env.STRIPE_PRICE_1SEMANA,
  "15 Días": process.env.STRIPE_PRICE_ID,
  "1 Mes": process.env.STRIPE_PRICE_1MES,
  "3 Meses": process.env.STRIPE_PRICE_3MESES,
  "12 Meses": process.env.STRIPE_PRICE_12MESES
};

export async function handler(event) {
  try {
    const { plan } = JSON.parse(event.body);
    
    if (!PLAN_PRICES[plan]) {
      throw new Error('Plan no válido');
    }

    // Crear sesión con metadata del plan seleccionado
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: PLAN_PRICES[plan],
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/`,
      metadata: {
        plan_seleccionado: plan // Guardamos el plan en los metadatos
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
}