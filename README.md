# 🚑 Red Health Data Hub

Self-service data extraction from **RedOS (BigQuery)** and **HBX (Snowflake)** — with a hybrid query engine (UI filters + AI natural language + predefined SQL).

---

## 🧩 Architecture

```
User Browser
  ↓
Next.js Frontend (Vercel)
  ├── Login Page (JWT auth)
  ├── Column Selector (dynamic, grouped)
  ├── Filter Panel (date, status, vehicle, city, revenue)
  ├── AI Query Input (Claude-powered NL → SQL)
  └── SQL Preview + Results + Export (CSV/Excel)

API Layer (Next.js Route Handlers)
  ├── POST /api/auth          → JWT login
  ├── GET  /api/columns       → column schema for source
  ├── POST /api/query         → build SQL (no execution)
  ├── POST /api/execute       → run query, return preview rows
  └── POST /api/export        → run query, stream full file

Hybrid Query Engine
  ├── UI Filter Layer         → WHERE clause injection
  ├── AI Interpretation Layer → Claude parses natural language → JSON
  └── Base SQL Layer          → wraps predefined CTEs from uploaded files

Databases
  ├── BigQuery (RedOS)        → fact_order, fleet_v2, response_metrics
  └── Snowflake (HBX)        → red_blade_orders_final, blade_vehicles_data
```

---

## 🚀 Local Setup

### 1. Clone & Install
```powershell
git clone https://github.com/YOUR_ORG/redos-hbx-extractor.git
cd redos-hbx-extractor
npm install
```

### 2. Configure Environment
```powershell
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Add Users
Generate a password hash:
```powershell
node -e "const b=require('bcryptjs'); console.log(b.hashSync('YourPassword123', 10))"
```

Paste into `USERS_JSON` in `.env.local`:
```
USERS_JSON=[{"email":"ops@redhealth.in","passwordHash":"$2a$10$...","name":"Ops Team","role":"ops"}]
```

### 4. BigQuery Credentials (Option A — Recommended)
```powershell
# Encode your service account JSON to base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path/to/service-account.json")) | clip
# Paste into BIGQUERY_CREDENTIALS_BASE64 in .env.local
```

### 5. Run Dev Server
```powershell
npm run dev
# → http://localhost:3000
```

---

## ☁️ Vercel Deployment

### One-time GitHub push
```powershell
git init
git add .
git commit -m "feat: initial Red Health Data Hub"
git remote add origin https://github.com/YOUR_ORG/redos-hbx-extractor.git
git push -u origin main
```

### Link to Vercel
```powershell
npx vercel --prod
# OR: Go to vercel.com → Import Git Repository → select your repo
```

### Set Vercel Environment Variables
In Vercel dashboard → Your Project → Settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `JWT_SECRET` | 32+ char random string | Generate: `openssl rand -hex 32` |
| `USERS_JSON` | JSON array (see above) | Must be valid JSON |
| `BIGQUERY_CREDENTIALS_BASE64` | base64 service account | Encode locally |
| `BIGQUERY_PROJECT_ID` | `redos-prod` | |
| `SNOWFLAKE_ACCOUNT` | `xxx.snowflakecomputing.com` | |
| `SNOWFLAKE_USERNAME` | your username | |
| `SNOWFLAKE_PASSWORD` | your password | Mark as secret |
| `SNOWFLAKE_DATABASE` | `BLADE` | |
| `SNOWFLAKE_WAREHOUSE` | your warehouse | |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | For AI query parsing |
| `MAX_ROWS` | `50000` | Row cap |

After setting env vars → **Redeploy**.

---

## 📁 Project Structure

```
redos-hbx-extractor/
├── app/
│   ├── page.tsx                  # Login page
│   ├── login.module.css
│   ├── layout.tsx
│   ├── globals.css
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard
│   │   └── dashboard.module.css
│   └── api/
│       ├── auth/route.ts         # POST /api/auth
│       ├── columns/route.ts      # GET  /api/columns
│       ├── query/route.ts        # POST /api/query
│       ├── execute/route.ts      # POST /api/execute
│       └── export/route.ts       # POST /api/export
│
├── components/
│   ├── ColumnSelector.tsx        # Grouped column checkboxes
│   ├── FilterPanel.tsx           # All UI filters
│   ├── NLQueryInput.tsx          # AI natural language input
│   ├── QueryPreview.tsx          # SQL preview with highlighting
│   └── ResultsTable.tsx          # Data grid + export buttons
│
├── lib/
│   ├── columnSchema.ts           # Unified RedOS+HBX column map
│   ├── queryBuilder.ts           # Core SQL generator
│   ├── aiParser.ts               # NL → JSON intent parser
│   ├── bigquery.ts               # BigQuery connector
│   ├── snowflake.ts              # Snowflake connector
│   ├── exportEngine.ts           # CSV + Excel export
│   └── auth.ts                   # JWT verify helper
│
├── .env.example                  # Environment template
├── .gitignore
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🔐 Security Checklist

- [x] JWT authentication (8h expiry)
- [x] bcrypt password hashing  
- [x] Credentials only in env vars (never in code)
- [x] No raw SQL injection (parameterized column/filter mapping)
- [x] Max row caps to prevent runaway queries
- [x] `.gitignore` excludes all credentials and `.env` files

---

## 📊 Column Coverage

| Group | RedOS | HBX |
|---|---|---|
| Trip Core | ✅ | ✅ |
| Timestamps (IST) | ✅ | ✅ |
| Finance & Pricing (₹) | ✅ | ✅ |
| Fleet & Vehicle | ✅ | ✅ |
| Partner & Site | ✅ | ✅ |
| Wallet | — | ✅ |
| Response Metrics | ✅ | — |
| User Attribution | ✅ | ✅ |
| Patient & Location | ✅ | ✅ |

---

## ⚡ Transformations Applied Automatically

| Type | From | To |
|---|---|---|
| Dates | UTC Epoch / Timestamp | IST formatted string |
| Money | Paise (int) | Rupees (₹, 2 decimal) |
| Distance | Meters | Kilometers (KM) |
| Column Names | Technical alias | Business-friendly label |

---

## 🔮 Planned Enhancements

- [ ] Saved queries (local storage / DB)
- [ ] Query templates (Ops / Finance / Growth)
- [ ] Role-based column access
- [ ] Query audit log
- [ ] Scheduled exports (email)
- [ ] Dashboard charts on results
