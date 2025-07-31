// Datos de los planes
const packages = [
  { duration: "1 Hora", price: "$5.00", pricePerDay: "$5.00 / hora", isFeatured: false },
  { duration: "24 Horas", price: "$10.00", pricePerDay: "$0.42 / hora", isFeatured: false },
  { duration: "5 Días", price: "$22.50", pricePerDay: "$4.50 / día", isFeatured: false },
  { duration: "1 Semana", price: "$35.00", pricePerDay: "$5.00 / día", isFeatured: false },
  { duration: "15 Días", price: "$50.00", pricePerDay: "$3.50 / día", isFeatured: true },
  { duration: "1 Mes", price: "$90.00", pricePerDay: "$3.00 / día", isFeatured: false },
  { duration: "3 Meses", price: "$225.00", pricePerDay: "$2.50 / día", isFeatured: false },
  { duration: "12 Meses", price: "$720.00", pricePerDay: "$2.00 / día", isFeatured: false }
];

let selectedPlan = null;

// Función para renderizar los planes
function renderPlans() {
  const plansList = document.getElementById('plansList');
  plansList.innerHTML = '';

  packages.forEach(pkg => {
    const planCard = document.createElement('div');
    planCard.className = 'compact-plan-card';
    if (selectedPlan && selectedPlan.duration === pkg.duration) {
      planCard.classList.add('compact-selected');
    }

    planCard.innerHTML = `
      ${pkg.isFeatured ? '<div class="compact-badge">POPULAR</div>' : ''}
      <div class="compact-plan-content">
        <div class="compact-plan-info">
          <h3 class="compact-duration">${pkg.duration}</h3>
          <p class="compact-price-detail">${pkg.pricePerDay}</p>
        </div>
        <div class="compact-price">${pkg.price}</div>
        <div class="compact-check ${selectedPlan && selectedPlan.duration === pkg.duration ? 'show' : ''}">
          <i class="fas fa-check-circle"></i>
        </div>
      </div>
    `;

    planCard.addEventListener('click', () => selectPlan(pkg));
    plansList.appendChild(planCard);
  });
}

function selectPlan(pkg) {
  selectedPlan = pkg;
  renderPlans();
  updateSummary();
  updateContinueButton();
}

// Función para actualizar el resumen
function updateSummary() {
  document.getElementById('selectedDuration').textContent = selectedPlan ? selectedPlan.duration : 'Ninguno';
  document.getElementById('selectedPrice').textContent = selectedPlan ? selectedPlan.price : '';
}

// Función para actualizar el botón de continuar
function updateContinueButton() {
  const continueBtn = document.getElementById('continueBtn');
  continueBtn.disabled = !selectedPlan;
}

// Función para proceder al pago (segura)
async function proceedToCheckout() {
  if (!selectedPlan) return;

  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan.duration })
    });
    
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al procesar el pago');
    const stripe = Stripe('pk_test_51RjVoePh2xXaeWr6suOAkFHKB4CKgT7FPqz5hV23H8WnSm2FQm3HYf0ctlwf21BOndY8nXF6f3YKtNnUhx22bWSp00oJ8GsfK2'); // Tu clave pública aquí
    await stripe.redirectToCheckout({ sessionId: data.id });
    
  } catch (err) {
    console.error('Error:', err);
    alert(`Error: ${err.message}`);
  }
}

// Event listeners
document.getElementById('continueBtn').addEventListener('click', proceedToCheckout);

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
  renderPlans();
  updateSummary();
  updateContinueButton();
});