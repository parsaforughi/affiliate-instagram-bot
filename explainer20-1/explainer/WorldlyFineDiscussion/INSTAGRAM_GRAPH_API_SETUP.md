# راهنمای تنظیم Instagram Graph API

این راهنما به شما کمک می‌کند تا Bot را با Instagram Graph API متصل کنید و دیگر نیازی به Session ID نباشد.

## ✅ کارهای انجام شده

1. ✅ فایل `instagram_api_client.js` - کلاس برای ارتباط با Graph API
2. ✅ فایل `page_manager.js` - مدیریت چندین Page
3. ✅ Webhook routes در `api-server.js`
4. ✅ OAuth routes برای اتصال Pages
5. ✅ به‌روزرسانی `product_card_sender.js` برای پشتیبانی از Graph API

## 📋 مراحل تنظیم

### مرحله 1: دریافت Page ID

Token شما:
```
EAAcf8NsupJgBQb8GpjkuyzF4EZAbDn0mqaf3SPsa8pfsyJ2hcZB7FkZAxHGqd1QmzFl7P4TxDl1u9chkfARJ6MqjcyHLZCn9iNA7VhPZA4Y6b8FVxS34R9qkf6UCBt0r5AAAEZCCu6povj7srTnCM8T2sZAz55zZBbe6rGowwqgO0snZC7U1VrQ6ZCQa4qnVGuVPG2TcbirZCT8YMxxyZAHJar9wHZA3WqZAg2EQjdaLeUZBFBtx4J4myCbT04ZAXi4hljYSQSz65kCsGl03lAioGAFjWodxLnVuZCQZDZD
```

برای دریافت Page ID:

**روش 1: از Graph API Explorer**
1. به https://developers.facebook.com/tools/explorer/ بروید
2. App را "Seylane Agent" انتخاب کنید
3. Token را paste کنید
4. Query را به این صورت تنظیم کنید:
   ```
   GET /me?fields=id,name
   ```
5. Execute کنید
6. `id` را کپی کنید (این Page ID شماست)

**روش 2: از Script**
```bash
node GET_PAGE_ID.js
```

### مرحله 2: اضافه کردن به .env

فایل `.env` را باز کنید و این خطوط را اضافه کنید:

```bash
# Instagram Graph API
INSTAGRAM_PAGE_ACCESS_TOKEN=EAAcf8NsupJgBQb8GpjkuyzF4EZAbDn0mqaf3SPsa8pfsyJ2hcZB7FkZAxHGqd1QmzFl7P4TxDl1u9chkfARJ6MqjcyHLZCn9iNA7VhPZA4Y6b8FVxS34R9qkf6UCBt0r5AAAEZCCu6povj7srTnCM8T2sZAz55zZBbe6rGowwqgO0snZC7U1VrQ6ZCQa4qnVGuVPG2TcbirZCT8YMxxyZAHJar9wHZA3WqZAg2EQjdaLeUZBFBtx4J4myCbT04ZAXi4hljYSQSz65kCsGl03lAioGAFjWodxLnVuZCQZDZD
INSTAGRAM_PAGE_ID=YOUR_PAGE_ID_HERE
WEBHOOK_VERIFY_TOKEN=luxirana_webhook_2024

# Meta App Credentials (برای OAuth)
APP_ID=your_app_id_here
APP_SECRET=your_app_secret_here
```

### مرحله 3: تنظیم Webhook در Meta Dashboard

1. به https://developers.facebook.com/apps/ بروید
2. App "Seylane Agent" را انتخاب کنید
3. از منوی سمت چپ "Webhooks" را انتخاب کنید
4. "Add Callback URL" را بزنید
5. URL را وارد کنید:
   ```
   https://affiliate-instagram-bot.onrender.com/webhook
   ```
6. Verify Token را وارد کنید:
   ```
   luxirana_webhook_2024
   ```
7. Subscription Fields را انتخاب کنید:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `messaging_optins`
8. "Verify and Save" را بزنید

### مرحله 4: اتصال Pages دیگر (اختیاری)

اگر می‌خواهید Pages دیگر را هم متصل کنید:

1. به این URL بروید:
   ```
   https://affiliate-instagram-bot.onrender.com/auth/facebook
   ```
2. با Facebook لاگین کنید
3. Pages شما به صورت خودکار اضافه می‌شوند

یا مستقیماً در `.env` اضافه کنید:
```bash
INSTAGRAM_PAGE_ACCESS_TOKEN=token1
INSTAGRAM_PAGE_ID=page_id1
```

## 🔧 استفاده

### حالت 1: استفاده از Graph API (پیشنهادی)

اگر `INSTAGRAM_PAGE_ACCESS_TOKEN` و `INSTAGRAM_PAGE_ID` در `.env` تنظیم شده باشند، Bot به صورت خودکار از Graph API استفاده می‌کند.

### حالت 2: استفاده از Puppeteer (Fallback)

اگر Token تنظیم نشده باشد، Bot از Puppeteer استفاده می‌کند (مثل قبل).

## 📡 Webhook

Bot به صورت خودکار پیام‌های ورودی را از Webhook دریافت می‌کند و پاسخ می‌دهد.

## 🔍 تست

1. Bot را راه‌اندازی کنید
2. یک پیام به Instagram Page بفرستید
3. Bot باید به صورت خودکار پاسخ دهد

## 📝 API Endpoints

- `GET /api/pages` - لیست Pages متصل شده
- `DELETE /api/pages/:pageId` - غیرفعال کردن یک Page
- `POST /api/pages/:pageId/activate` - فعال کردن یک Page
- `GET /auth/facebook` - اتصال Pages جدید
- `GET /webhook` - Webhook verification
- `POST /webhook` - دریافت پیام‌ها

## ⚠️ نکات مهم

1. **Token Expiry**: Page Access Token معمولاً 60 روز اعتبار دارد. باید قبل از انقضا Renew کنید.

2. **Rate Limits**: Instagram Graph API محدودیت دارد (حدود 200 پیام در ساعت).

3. **App Review**: برای استفاده در Production، باید App Review را پاس کنید.

4. **Development Mode**: در Development Mode، فقط Test Users می‌توانند استفاده کنند.

## 🎉 تمام!

حالا Bot شما با Instagram Graph API کار می‌کند و دیگر نیازی به Session ID نیست!

