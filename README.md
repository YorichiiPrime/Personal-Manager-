# 🔥 Yori's Personal Messenger Bot
> A sleek, serverless Telegram messenger bot built for **@YoriFederation** by **@Yorichiiprime**

## ✨ Features
- 🔒 Force Join Channel before usage
- 📨 Collect Text, Photo, Video, Docs, Audio & Voice
- 🛡️ Auto Profanity Filter
- ✅ Preview → Send/Edit/Cancel Flow
- 💬 Admin `/reply @username message` (auto-cleans forwarded msgs)
- 📊 `/stats` dashboard
- 🔥 Full-screen Fire Effect on `/start`
- ⚡ Serverless on Vercel + Neon DB

## 🚀 Deployment (3 Steps)

1. **Create Neon DB**  
   Go to [neon.tech](https://neon.tech) → New Project → Copy `POSTGRES_URL`

2. **Deploy to Vercel**  
```bash
   git init && git add . && git commit -m "init"
   vercel --prod
```
   Add these Env Variables in Vercel Dashboard:
   | Key | Value |
   |---|---|
   | `BOT_TOKEN` | Your `@BotFather` token |
   | `OWNER_ID` | `12345678` |
   | `REQUIRED_CHANNEL` | `@channel_username` |
   | `POSTGRES_URL` | Neon connection string |
   | `BOT_USERNAME` | Your bot's `@username without @` |

3. **Set Webhook**  
   After deploy, run once in browser:
