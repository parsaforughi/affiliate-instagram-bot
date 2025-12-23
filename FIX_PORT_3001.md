# حل مشکل پورت 3001

اگر پورت 3001 در حال استفاده است، دستورات زیر را اجرا کنید:

## روش 1: توقف همه فرآیندهای روی پورت 3001

```bash
# پیدا کردن PID فرآیندها
lsof -ti:3001

# توقف همه فرآیندها
lsof -ti:3001 | xargs kill -9

# یا به صورت دستی:
kill -9 73920 74214
```

## روش 2: توقف با fuser (اگر در دسترس است)

```bash
fuser -k 3001/tcp
```

## روش 3: بررسی فرآیندها

```bash
# دیدن فرآیندها
lsof -i:3001

# سپس توقف دستی
kill -9 <PID>
```

## پس از توقف فرآیندها

```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer-api"
npm start
```

سرور باید روی **http://localhost:3001** راه‌اندازی شود.

