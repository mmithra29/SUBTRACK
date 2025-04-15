document.getElementById("paymentForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const plan = this.plan.value;
    const amount = plan === "Basic" ? 199 : 499;
  
    fetch("http://localhost:5000/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: 1, plan, amount })
    })
      .then((res) => res.json())
      .then((data) => {
        document.getElementById("statusMsg").textContent = data.message;
      });
  });
  