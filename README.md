# Control de Ventas

App web para registrar ventas (efectivo / transferencia) desde varios dispositivos, con
sincronización en tiempo real y dos perfiles: **administrador** y **vendedor**.

## Perfiles

| | Vendedor | Administrador |
|---|---|---|
| Vender (efectivo / transferencia) | ✅ | ✅ |
| Crear y editar productos | ✅ (borra solo los suyos) | ✅ |
| Ver sus propias ventas y su resumen | ✅ | ✅ |
| Borrar una venta | Solo las suyas, hasta 15 min después | ✅ todas |
| Ver ventas de todos, por vendedor | — | ✅ |
| Gastos, ganancias, cuánto debería haber en caja | — | ✅ |
| Aprobar / desactivar vendedores (Equipo) | — | ✅ |

## Primer uso

1. Abre la app y toca **Crear cuenta**. **La primera cuenta que se registra queda como administrador**.
2. Cada vendedor abre la app en su celular y toca **Crear cuenta**.
3. El administrador entra a **Equipo** y toca **Aprobar**. El vendedor entra automáticamente.

## Base de datos (Supabase)

Usa el proyecto Supabase **kasa_diamante** (`vlptkwoderbrbqylqjvx`), con tablas propias de prefijo
`mic_` (`mic_profiles`, `mic_products`, `mic_sales`, `mic_expenses`) para no mezclarse con las de Kasa Diamante.
El esquema ya está aplicado; [`supabase.sql`](supabase.sql) queda como referencia.

La URL y la clave pública vienen incluidas en el código (están hechas para ir en el navegador; la
seguridad la dan las políticas RLS). Se pueden cambiar con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### Ajustes recomendados en Supabase (Authentication)

- **URL Configuration → Redirect URLs**: agrega la URL de Vercel (ej. `https://micheladas.vercel.app/**`) para que
  el correo de confirmación regrese a esta app y no al sitio de Kasa Diamante.
- Si no quieres que los vendedores tengan que confirmar el correo, desactiva **Confirm email** en
  *Sign In / Providers → Email* (afecta también a Kasa Diamante).

## Ejecutar en tu computador

```bash
npm install
npm run dev
```

## Desplegar en Vercel

1. Importa el repositorio en https://vercel.com → **Add New → Project** (Vite se detecta solo).
2. Opcional: variable `VITE_BUSINESS_NAME` con el nombre del negocio.
3. **Deploy**.
