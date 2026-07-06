# 💰 Gastos Casa

App para gestionar gastos diarios y mensuales en pareja: categorías, ingresos,
presupuestos con alertas, gastos recurrentes automáticos y cuentas compartidas
con saldo "quién le debe a quién".

**Stack**: Next.js 16 + Supabase (base de datos + login con Google) + Vercel.

---

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea una cuenta (puedes usar tu GitHub).
2. **New project** → elige nombre (ej: `gastos-casa`), una contraseña de base de datos (guárdala) y región `EU (Frankfurt)` o la más cercana.
3. Cuando termine de crearse, ve a **SQL Editor** → pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Esto crea todas las tablas, seguridad y funciones.

### 2. Activar el login con Google

1. En Supabase: **Authentication → Sign In / Providers → Google** → actívalo. Ahí verás la **Callback URL** (algo como `https://xxxx.supabase.co/auth/v1/callback`) — cópiala.
2. Ve a [console.cloud.google.com](https://console.cloud.google.com) → crea un proyecto → **APIs & Services → OAuth consent screen** → tipo *External*, rellena nombre y tu email → guarda.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → tipo *Web application*:
   - **Authorized redirect URIs**: pega la Callback URL de Supabase.
4. Copia el **Client ID** y **Client Secret** que te da Google y pégalos en la pantalla del proveedor Google en Supabase → **Save**.

### 3. Conectar la app

1. En Supabase: **Project Settings → API** → copia la **Project URL** y la **anon public key**.
2. Pégalas en el archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Probar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000, entra con Google, crea tu hogar, y en **Ajustes**
copia el código de invitación para que tu mujer se una desde su cuenta.

### 5. Deploy en Vercel

1. Sube el código a GitHub (repo nuevo, puede ser privado).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo → en **Environment Variables** añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Deploy**.
3. Con la URL final (ej: `https://gastos-casa.vercel.app`), en Supabase ve a
   **Authentication → URL Configuration**:
   - **Site URL**: `https://gastos-casa.vercel.app`
   - **Redirect URLs**: añade `https://gastos-casa.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`

¡Listo! La app queda online para los dos, desde el móvil o el ordenador.

---

## Funcionalidades

- **Gastos**: monto, categoría, fecha, nota, quién lo pagó, y si es *compartido* o *personal*.
- **Cuentas en pareja**: los gastos compartidos se dividen (50/50 por defecto, configurable en Ajustes); el dashboard muestra quién le debe a quién y un botón para saldar cuentas.
- **Ingresos**: sueldos y otros ingresos, con total y ahorro del mes.
- **Presupuestos**: límite mensual por categoría con alertas al 80% y al superarlo.
- **Recurrentes**: alquiler, suscripciones, etc. se registran solos cada mes.
- **Categorías personalizables** con emoji.
- **Gráfico** de gastos del mes por categoría.
