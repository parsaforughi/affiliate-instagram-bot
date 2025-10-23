// Quick reply to Salar's message
const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function replyToSalar() {
  const userMessage = "چند درصد تخفیف میدید؟";
  
  const systemPrompt = `
🌿 تو نماینده باهوش، گرم و انسانی برند «سیلانه» هستی

💰 سود و کمیسیون:
- کمیسیون: ۲۰٪ تا ۴۰٪ از هر فروش
- کد تخفیف شخصی: ۲۰٪ تا ۴۰٪ برای مخاطبان
- پرداخت مستقیم و سریع
- بدون سقف درآمد

به این پیام جواب بده: "${userMessage}"

فرمت JSON:
{
  "message": "متن پاسخ به فارسی",
  "sendLink": false
}
`;

  try {
    console.log("🤖 Getting response from OpenAI...");
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const reply = JSON.parse(data.choices[0].message.content);
    
    console.log("\n✅ Response:");
    console.log(reply.message);
    console.log("\n📋 Copy this and send to Salar manually:");
    console.log("----------------------------------------");
    console.log(reply.message);
    console.log("----------------------------------------\n");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

replyToSalar();
