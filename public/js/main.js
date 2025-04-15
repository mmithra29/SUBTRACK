document.getElementById("paymentForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const plan = this.plan.value;
    const amount = plan === "Basic" ? 199 : 499;
    const token = localStorage.getItem('token');

    if (!token) {
        document.getElementById("statusMsg").textContent = "Please login first";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/subscribe", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ plan, amount })
        });

        const data = await response.json();
        document.getElementById("statusMsg").textContent = data.message || data.error;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById("statusMsg").textContent = "An error occurred";
    }
});
  