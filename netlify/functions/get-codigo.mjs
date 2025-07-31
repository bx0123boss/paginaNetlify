import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);


const sql = neon(process.env.NETLIFY_DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  // Verificar método HTTP
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }

  const sessionId = event.queryStringParameters?.session_id;
  
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Falta el parámetro session_id' }),
    };
  }

  try {
    // 1. Recuperar sesión de Stripe con más detalles
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.charges.data']
    });

    console.log('Sesión recuperada:', {
      id: session.id,
      payment_status: session.payment_status,
      customer_details: session.customer_details,
      payment_intent: session.payment_intent,
      metadata: session.metadata
    });

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'El pago no ha sido completado' }),
      };
    }

    // 2. Obtener información detallada del pago
    const paymentIntent = session.payment_intent;
    const charge = paymentIntent?.charges?.data?.[0];
    
    // 3. Obtener plan de los metadatos
    const plan = session.metadata?.plan_seleccionado;
    if (!plan) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se pudo determinar el plan comprado' }),
      };
    }

    // 4. Obtener código de la base de datos
    const codigoExistente= await sql`
      SELECT codigo FROM codigos 
      WHERE session_id = ${sessionId}
      LIMIT 1
    `;
    
    if (codigoExistente?.length > 0) {
      console.log('Código ya asignado para esta sesión:', codigoExistente[0].codigo);
         // Obtener detalles del pago para la respuesta
      const paymentIntent = session.payment_intent;
      const charge = paymentIntent?.charges?.data?.[0];
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          codigo: codigoExistente[0].codigo,
          tipo_paquete: plan,
          existe: true, // Indicador de que es un código previamente asignado
          detalles_pago: {
            id_sesion: session.id,
            id_payment_intent: paymentIntent?.id,
            nombre: session.customer_details?.name || charge?.billing_details?.name || null,
            email: session.customer_details?.email || charge?.billing_details?.email || null
          }
        }),
      };
    }
    
    const result = await sql`
      SELECT codigo FROM codigos 
      WHERE usado = false AND tipo_paquete = ${plan}
      LIMIT 1
    `;
    if (!result?.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `No hay códigos disponibles para el paquete ${plan}` }),
      };
    }

    const codigo = result[0].codigo;

    await sql`
      UPDATE codigos 
      SET usado = true, fecha_uso = NOW(), session_id = ${sessionId}, id_compra_stripe= ${paymentIntent?.id}
      WHERE codigo = ${codigo}
    `;

    const responseData = {
      codigo,
      tipo_paquete: plan,
      detalles_pago: {
        // IDs importantes
        id_sesion: session.id,
        id_payment_intent: paymentIntent?.id,
        id_cargo: charge?.id,
        
        // Datos del cliente
        nombre: session.customer_details?.name || charge?.billing_details?.name || null,
        email: session.customer_details?.email || charge?.billing_details?.email || null,
        telefono: session.customer_details?.phone || charge?.billing_details?.phone || null,
        
        // Datos de la transacción
        monto: session.amount_total ? session.amount_total / 100 : null,
        moneda: session.currency?.toUpperCase(),
        fecha: new Date(session.created * 1000).toISOString(),
        metodo_pago: charge?.payment_method_details?.type || null,
        recibo_url: charge?.receipt_url || null,
        
        // Detalles de tarjeta (si aplica)
        ultimos4: charge?.payment_method_details?.card?.last4 || null,
        marca_tarjeta: charge?.payment_method_details?.card?.brand || null
      }
    };

    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY );

   // CORREO
    if (responseData.detalles_pago.email) {
      try {
        const data = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: responseData.detalles_pago.email,
          subject: '¡Gracias por tu compra!',
          html: `<p>Hola ${session.customer_details?.name || 'cliente'},</p><p>Tu Voucher es: <strong>${codigo}</strong>.</p>`
        });
        console.log('Correo enviado:', data);
      } catch (error) {
        console.error('Error enviando correo:', error);
      }
    } else {
      console.warn('No hay email válido para enviar correo');
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };

  } catch (err) {
    console.error('Error en la función:', {
      message: err.message,
      stack: err.stack
    });

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  }
}