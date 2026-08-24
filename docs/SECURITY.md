# Seguridad de Sorella

## Autorización real

React no decide quién puede administrar el catálogo. La autorización se aplica en PostgreSQL mediante RLS.

La versión actual separa dos comprobaciones:

- `has_moderator_role()`: confirma que la cuenta tiene el rol `moderator` y permite llegar al flujo MFA.
- `is_moderator()`: exige rol `moderator` **y** JWT con `aal = aal2`.

Las políticas de escritura y lectura privada utilizan `is_moderator()`. Por eso modificar React, abrir `/admin` manualmente o llamar la API fuera del navegador no evita el segundo factor.

## MFA / 2FA

El panel usa TOTP de Supabase Auth. Una sesión con contraseña queda en AAL1. Solo después de verificar el código TOTP alcanza AAL2.

El dashboard, inventario, escritura de productos, imágenes y analytics privadas están bloqueados por RLS mientras la sesión siga en AAL1.

Mantén MFA habilitado en Supabase Auth y evita crear caminos alternativos que otorguen acceso administrativo sin AAL2.

## Analytics

Se utiliza un UUID anónimo persistido localmente para aproximar visitantes únicos. No se registra nombre, correo, IP desde el frontend ni contenido de conversaciones.

La tabla `analytics_events`:

- permite `INSERT` al público,
- niega lectura pública,
- permite lectura solo al moderador con AAL2,
- agrega datos para el dashboard mediante `get_admin_analytics()`.

Un cliente público puede falsificar/spamear eventos porque cualquier catálogo web necesita poder registrar sus propias métricas. Para analítica antifraude de nivel empresarial, mueve la ingestión a un servicio/Edge Function con controles adicionales.

## Secretos

Permitido en frontend:

- `VITE_SUPABASE_URL`
- publishable/anon key de Supabase cuando RLS está correctamente configurado.

Nunca en frontend:

- `service_role`
- contraseña de base de datos
- claves privadas
- tokens permanentes de servicios externos

## Imágenes

El bucket `product-images` es público solo para lectura de las fotos. Las escrituras requieren moderador + MFA mediante RLS de Storage.

La aplicación limita archivos a JPG, PNG, WebP o AVIF y 5 MB.

## Despliegue

1. Ejecuta `supabase/upgrade.sql` en instalaciones existentes.
2. Prueba el login y configura TOTP para cada moderador.
3. Comprueba que una sesión AAL1 no pueda leer `inventory` ni escribir `products`.
4. Comprueba que anon no pueda leer `analytics_events`.
5. Usa HTTPS.
6. Mantén `.env` fuera del repositorio.
7. Configura fallback SPA para `/producto/*` y `/admin/*`.
8. Cambia los enlaces de redes de ejemplo.
9. Revisa periódicamente Auth Logs y Database Logs en Supabase.
10. Rota cualquier secreto si se filtra.
