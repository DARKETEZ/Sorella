# Sorella Eyewear — catálogo + dashboard seguro

Proyecto React + TypeScript + Tailwind CSS + Framer Motion + Supabase.

## Incluido en esta versión

- Catálogo público moderno, responsive y animado.
- Logo de Sorella en navegación y favicon.
- Una URL compartible por producto: `/producto/nombre--UUID`.
- Galería de varias fotos por producto.
- Estado de agotado con tratamiento visual elegante.
- Consultas directas por WhatsApp e Instagram.
- Tracking anónimo de visitas, visitantes, aperturas de producto y clics en redes.
- Dashboard privado con visitas, visitantes únicos, vistas de producto, clics a WhatsApp, tendencia diaria y productos más vistos.
- Buscador interno en el panel por nombre, categoría, descripción o color.
- Inventario, alertas de stock bajo y productos agotados.
- Login de moderador con MFA/2FA TOTP obligatorio.
- RLS: las operaciones sensibles requieren rol `moderator` + sesión AAL2 (2FA verificado).

## IMPORTANTE: si ya tenías la base anterior

Antes de usar el nuevo `/admin`, abre **Supabase > SQL Editor** y ejecuta completo:

```text
supabase/upgrade.sql
```

Este archivo es idempotente y agrega/actualiza:

- `product_images`
- `analytics_events`
- `has_moderator_role()`
- `is_moderator()` con requisito AAL2
- `get_admin_analytics()`
- políticas RLS para galería y analíticas

Después de ejecutar el upgrade, cierra la sesión de admin que tengas abierta y vuelve a iniciar sesión.

## 1. Instalar y ejecutar

```bash
npm install
npm run dev
```

Catálogo:

```text
http://localhost:5173/
```

Panel:

```text
http://localhost:5173/admin
```

## 2. MFA / 2FA

El flujo es obligatorio para cuentas moderadoras:

1. Inicia sesión con correo y contraseña.
2. Serás enviado a `/admin/mfa`.
3. Si es la primera vez, escanea el QR con Google Authenticator, Microsoft Authenticator, 1Password, Authy u otra app TOTP.
4. Ingresa el código de 6 dígitos.
5. La sesión sube a `aal2` y se habilita el dashboard.

Si la cuenta ya tenía un factor TOTP, solo pedirá el código.

En **Supabase > Authentication > Multi-Factor Authentication** asegúrate de no tener deshabilitada la verificación MFA/TOTP.

## 3. Analytics

La web genera un UUID aleatorio por navegador en `localStorage`. No se guarda nombre, correo ni identidad real del visitante.

Eventos registrados:

- `page_view`
- `product_view`
- `whatsapp_click`
- `instagram_click`

El público solo puede **insertar** eventos. Solo un moderador con MFA (`aal2`) puede leer estadísticas.

`Visitantes únicos` significa navegadores/instalaciones únicas aproximadas, no personas identificadas. Un mismo usuario en dos dispositivos puede contar como dos visitantes.

## 4. URLs individuales de producto

Cada producto tiene una ruta como:

```text
/producto/sorella-roma--UUID
```

Para producción, el hosting debe servir `index.html` como fallback de SPA. Se incluye `public/_redirects` para Netlify. En otros hostings configura una regla equivalente.

## 5. Variables de entorno

El proyecto usa:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Solo utiliza una publishable/anon key en frontend. Nunca coloques `service_role`, contraseña de base de datos o secretos privados en variables `VITE_*`.

`.env` está ignorado por Git.

## 6. Crear moderadores

Crea el usuario en **Authentication > Users** y asigna el rol con:

```sql
insert into public.user_roles (user_id, role)
values ('UUID-DEL-USUARIO', 'moderator');
```

No hay registro público de administradores.

## 7. Redes sociales

Antes de publicar cambia los valores de ejemplo en:

```text
src/App.tsx
src/components/ProductPage.tsx
src/components/ProductModal.tsx
```

Busca:

```text
50370000000
https://instagram.com/
```

## 8. Construcción de producción

```bash
npm run build
npm run preview
```

Antes de publicar revisa `docs/SECURITY.md`.

## Interfaz móvil optimizada

Esta versión incluye una revisión mobile-first del catálogo y del panel administrativo:

- Catálogo a 2 columnas desde 320 px y 3 columnas en escritorio.
- Tarjetas de producto compactas con imágenes `object-contain` para no recortar los lentes.
- Menú hamburguesa en teléfono.
- Filtros de categorías con desplazamiento horizontal táctil.
- Página individual de producto con galería horizontal y CTA de WhatsApp fijo en la parte inferior del teléfono.
- Estados de agotado con imagen atenuada y señalización visual.
- Dashboard en cuadrícula de 2 columnas en móvil.
- Inventario en tarjetas táctiles en móvil; tabla tradicional a partir de escritorio.
- Editor de producto a pantalla completa en móvil con botones Guardar/Cancelar fijos abajo.
- Soporte de safe-area para iPhone y reducción de movimiento cuando el sistema lo solicita.
