# راهنمای راه‌اندازی همه سرورها

## پورت‌ها
- **explainer-api**: پورت 3001 (API سرور affiliate bot)
- **MastermindOSDashboard**: پورت 5173 (داشبورد UI)

## دستورات راه‌اندازی

### Terminal 1: API سرور affiliate bot
```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer-api"
npm install
npm start
```
این سرور روی **http://localhost:3001** اجرا می‌شود

### Terminal 2: MastermindOS Dashboard
```bash
cd "/Users/parsa/Desktop/seylane ai/MastermindOSDashboard"
npm install
npm run dev
```
این سرور روی **http://localhost:5173** اجرا می‌شود

### Terminal 3: Bot (اختیاری)
```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion"
npm start
```

## دسترسی
- **Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

## نکات
- اگر پورت 3001 یا 5173 در حال استفاده است:
  ```bash
  # پیدا کردن process
  lsof -ti:3001
  lsof -ti:5173
  
  # توقف process
  kill -9 <PID>
  
  # یا توقف همه:
  lsof -ti:3001 | xargs kill -9
  lsof -ti:5173 | xargs kill -9
  ```
