// Remove the old payment form handler if it's not being used
document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById("paymentForm");
    if (paymentForm) {
        paymentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.href = `payment.html?service=${paymentForm.service.value}&amount=${paymentForm.amount.value}&plan=${paymentForm.plan.value}`;
        });
    }
});
  