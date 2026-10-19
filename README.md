# Control de Ventas

App web para registrar ventas (efectivo / transferencia), gastos, y ver un resumen
de cuánto debería haber en caja y en la cuenta.

- **Vender**: toca los productos, ajusta cantidades y cobra con un botón: *Efectivo* o *Transferencia*. Incluye calculadora de cambio, nota opcional, "monto libre" y botón *Deshacer*.
- **Resumen**: filtra por hoy / ayer / semana / mes / rango. Muestra cuánto debería haber en efectivo y en transferencias (ventas − gastos de cada método), ingresos, gastos, ganancia, ticket promedio, gráfico de ventas y productos más vendidos.
- **Ventas**: historial por día, filtros por método, eliminar ventas y exportar a Excel (CSV).
- **Gastos**: registra gastos con categoría, método de pago y fecha.
- **Productos**: crea, edita, oculta o elimina productos (nombre, precio, categoría, emoji y color).

## Ejecutar en tu computador

```bash
npm install
npm run dev
```

## Dónde se guardan los datos

| Modo | Cómo se activa | Qué significa |
|---|---|---|
| **Local** (por defecto) | Sin variables de entorno | Los datos quedan en el navegador de ese dispositivo. Usa *Respaldo* / *Restaurar* para guardar copias. |
| **Nube (Supabase)** | Configurando `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` | Todos los celulares/computadores ven los mismos datos. **Recomendado** si venden desde más de un dispositivo. |

### Activar Supabase (gratis)

1. Crea un proyecto en https://supabase.com.
2. Ve a **SQL Editor**, pega el contenido de [`supabase.sql`](supabase.sql) y ejecútalo.
3. En **Project Settings → API** copia la *Project URL* y la *anon public key*.
4. Ponlas como variables de entorno (en Vercel o en un archivo `.env` local, ver `.env.example`).

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repositorio. Vercel detecta Vite automáticamente (`vercel.json` ya está listo).
3. En **Environment Variables** agrega (opcionales):
   - `VITE_BUSINESS_NAME` → nombre del negocio que aparece en la app.
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → para guardar en la nube.
   - `VITE_APP_PIN` → PIN para entrar a la app.
4. **Deploy**. Si cambias variables después, haz *Redeploy*.

También puedes desplegar desde la terminal:

```bash
npx vercel --prod
```

> Nota de seguridad: el PIN es una protección básica en el navegador. Con Supabase, cualquiera que tenga la URL de la app podría acceder a los datos, así que no compartas el enlace públicamente.
