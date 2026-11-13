# PixForge — Deploy Guide (Phase 4)

Ye guide app ko live karne ke steps batati hai. Kul time: ~30–45 minute.

Aapko 3 free accounts chahiye:
1. **MongoDB Atlas**: database (login, presets, history)
2. **Vercel**: hosting (app live karne ke liye)
3. **Google Cloud**: sirf "Continue with Google" button ke liye (optional)

> Image tools bina in sab ke bhi chalte hain. Ye sirf login aur live website ke liye chahiye.

---

## Step 1: MongoDB Atlas (database)

1. https://www.mongodb.com/cloud/atlas par free account banao.
2. **Create a cluster** → **M0 (Free)** chuno → region: Mumbai (`ap-south-1`) ya aapke paas wala → Create.
3. **Database Access** → *Add New Database User*
   - Username: `pixforge`
   - Password: **Autogenerate**, phir copy karke safe jagah rakho
   - Role: *Read and write to any database*
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   Vercel ke servers ke IP badalte rehte hain, isliye ye zaroori hai. Database phir bhi password se protected rahega.
5. **Database** → *Connect* → *Drivers* → connection string copy karo. Wo aisa dikhega:
   ```
   mongodb+srv://pixforge:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   `<password>` ki jagah apna password daalo. Ye aapka **`MONGODB_URI`** hai.

## Step 2: AUTH_SECRET banao

Project folder mein ye command chalao:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Jo lambi random line aaye, wahi aapka **`AUTH_SECRET`** hai. Ise kisi ke saath share mat karna.

## Step 3: Local par Atlas test karo (optional, recommended)

`.env.local` file mein ye values daalo:

```env
AUTH_SECRET=<step 2 wala secret>
MONGODB_URI=<step 1 wala connection string>
MONGODB_DB=pixforge
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Phir ye chalao:

```bash
npm run dev
```

http://localhost:3000/signup par account banao. Agar ho gaya, to Atlas sahi connected hai.

## Step 4: Vercel par deploy

1. https://vercel.com par **GitHub se sign up** karo.
2. **Add New → Project** → `Resize-image-app` repo **Import** karo.
   - Repo `myfdsdev` account ka hai. Agar list mein na dikhe, to repo owner ko Vercel GitHub App ko is repo ka access dena hoga (GitHub → Settings → Applications → Vercel → Repository access). Ya owner khud Vercel par import kare.
3. Framework apne aap **Next.js** detect hoga. Build settings mat badlo.
4. **Environment Variables** mein ye daalo:

   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | step 2 wala secret |
   | `MONGODB_URI` | step 1 wala connection string |
   | `MONGODB_DB` | `pixforge` |
   | `KEY_ENCRYPTION_SECRET` | ek aur naya secret (step 2 wala command dobara chalao) |
   | `NEXT_PUBLIC_SITE_URL` | abhi khaali chhodo (step 6 mein bharenge) |

5. **Deploy** dabao. 2–3 minute mein URL milega, jaise `https://resize-image-app.vercel.app`.
6. Settings → Environment Variables mein `NEXT_PUBLIC_SITE_URL` = aapka live URL (aakhir mein `/` nahi) daalo → **Deployments → Redeploy**.

> **Vercel Hobby (free) plan** non-commercial use ke liye hai. Abhi app free hai aur koi payment nahi hai, to ye theek hai. Aage ads ya paid plans lagaoge to Vercel Pro lena hoga, ya Netlify/Cloudflare par shift karna padega.

> `KEY_ENCRYPTION_SECRET` users ki fal.ai keys ko encrypt karta hai. Ise ek baar set karke **kabhi mat badalna**. Badla to saari saved keys bekaar ho jaayengi aur users ko key dobara daalni padegi.

## Step 5: Google login (optional)

1. https://console.cloud.google.com → naya project `PixForge`.
2. **APIs & Services → OAuth consent screen** → External → app name `PixForge`, apna support email → Save.
3. **Credentials → Create Credentials → OAuth client ID** → *Web application*
   - Authorized JavaScript origins: `https://<aapka-domain>`
   - Authorized redirect URIs: `https://<aapka-domain>/api/auth/callback/google`
   - Local test ke liye bhi jodo: `http://localhost:3000` aur `http://localhost:3000/api/auth/callback/google`
4. Client ID aur Client Secret ko Vercel env mein daalo:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
5. Redeploy karo. Login page par "Continue with Google" button apne aap dikhne lagega.

## Step 6: Custom domain (optional)

1. Domain kharido (jaise `pixforge.app`).
2. Vercel → Project → **Settings → Domains** → domain add karo, aur jo DNS records Vercel bataye wo registrar par lagao.
3. `NEXT_PUBLIC_SITE_URL` ko naye domain par update karo. Google OAuth ke URLs bhi update karo → Redeploy.

---

## Launch ke baad checklist

- [ ] Home page khulta hai, share image dikhti hai (`/opengraph-image`)
- [ ] `/app` mein 20 photos upload → process → ZIP download
- [ ] Signup → login → logout
- [ ] Settings save karke reload → settings wapas aati hain
- [ ] Saved Presets banao → editor mein dikhta hai
- [ ] History mein batch dikhta hai
- [ ] API Key page par apni fal.ai key daalo → AI Tools mein Remove background chalao (≈ $0.02)
- [ ] Phone par khol kar dekho (menu, upload, process)
- [ ] `/sitemap.xml` aur `/robots.txt` sahi URL dikhate hain
- [ ] Google Search Console mein site aur sitemap submit karo

## Kuch zaroori baatein

- `.env.local` kabhi GitHub par mat daalo (ye already `.gitignore` mein hai).
- Secret ya password leak ho jaaye to Atlas mein DB user ka password badlo aur naya `AUTH_SECRET` banao (isse sab log logout ho jaayenge).
- Photos kabhi server par nahi jaati. Database mein sirf accounts, settings, presets aur numbers (history) save hote hain.
