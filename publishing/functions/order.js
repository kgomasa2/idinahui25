export async function onRequestPost(context) {
  // Отримання даних із запиту сайту
  const request = context.request;
  const body = await request.json();
  const { name, phone, post } = body;

  // Інтеграція секретних ключів (безпечно, оскільки виконується на сервері)
  const TELEGRAM_BOT_TOKEN = '8224878360:AAFGBRzhaHPR6PYXoSw09oTA_ub1ioLPUW8';
  const TELEGRAM_CHAT_ID = '228927588';

  // Формування тексту повідомлення
  const message = `🔥 *НОВЕ ЗАМОВЛЕННЯ (Зін Мама)*\n\n👤 Ім'я: ${name}\n📱 Тел: ${phone}\n📦 Доставка: ${post}\n\n💵 _Клієнт перейшов до оплати..._`;

  // Формування URL для Telegram API
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    // Відправка запиту на сервери Telegram
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    // Повернення статусу 200 (ОК) для сайту
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    // Повернення статусу помилки у разі збою
    return new Response(JSON.stringify({ error: 'Помилка відправки в Telegram' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}