exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const body = JSON.parse(event.body || "{}");
  const customerEmail = body.email || "customer@example.com";

  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  const idempotenceKey = Date.now().toString();

  const paymentData = {
    amount: { value: "9900.00", currency: "RUB" },
    receipt: {
      customer: { email: customerEmail },
      items: [
        {
          description: "Курс: Заработок на свадебной полиграфии из дома",
          quantity: "1.00",
          amount: { value: "9900.00", currency: "RUB" },
          vat_code: 1,
          payment_mode: "full_payment",
          payment_subject: "service",
        },
      ],
    },
    confirmation: {
      type: "redirect",
      return_url: "https://luminous-bunny-9d26b3.netlify.app/success.html",
    },
    capture: true,
    description: "Курс: Заработок на свадебной полиграфии из дома",
  };

  try {
    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(paymentData),
    });

    const payment = await response.json();

    if (payment.confirmation && payment.confirmation.confirmation_url) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ url: payment.confirmation.confirmation_url }),
      };
    } else {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Не удалось создать платёж", details: payment }),
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
