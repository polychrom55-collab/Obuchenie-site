const https = require("https");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;
  const idempotenceKey = Date.now().toString();

  const paymentData = JSON.stringify({
    amount: {
      value: "9900.00",
      currency: "RUB",
    },
    confirmation: {
      type: "redirect",
      return_url: "https://ТВОЙ_САЙТ.netlify.app/success.html",
    },
    capture: true,
    description: "Курс: Заработок на свадебной полиграфии из дома",
  });

  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");

  return new Promise((resolve) => {
    const options = {
      hostname: "api.yookassa.ru",
      path: "/v3/payments",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
        "Content-Length": Buffer.byteLength(paymentData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const payment = JSON.parse(data);
          if (payment.confirmation && payment.confirmation.confirmation_url) {
            resolve({
              statusCode: 200,
              headers: { "Access-Control-Allow-Origin": "*" },
              body: JSON.stringify({
                url: payment.confirmation.confirmation_url,
              }),
            });
          } else {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: "Не удалось создать платёж", details: payment }),
            });
          }
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
        }
      });
    });

    req.on("error", (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(paymentData);
    req.end();
  });
};
