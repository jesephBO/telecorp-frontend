# TeleCorp · Portal de conectividad

Frontend React + Vite para el portal de clientes y el centro de operaciones de Red TeleCorp.

El dashboard y Estado de red incluyen el mapa satelital React Leaflet con las tres capas de Esri, filtros, cobertura por antena, telemetría, impacto y el Analista de Red (IA). Consulta [MAPA_ESRI.md](./MAPA_ESRI.md) para contratos, permisos, pruebas y los bloqueos detectados en el backend desplegado. El mapa consulta la última medición de todas las antenas del área; el panel de resumen previo conserva su muestra de ocho antenas.

## Inicio local

Desde esta carpeta, copia `.env.example` como `.env.local` y completa los valores reales de despliegue:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Los valores de URL y Cognito se generan al desplegar el backend con `services/deploy_all.sh`; están en `services/.deploy-all-output/postman.environment.json` como `identity_base_url`, `incidents_base_url`, `telemetry_base_url`, `coverage_base_url`, `notifications_base_url`, `infrastructure_base_url`, `field_base_url` y `cognito_client_id`. El `cognito_user_pool_id` también está disponible ahí, aunque el navegador usa el `client_id` y la región. Copia sus valores a las variables Vite correspondientes. Las variables `VITE_*` se incluyen en el bundle del navegador: no coloques claves privadas, secretos de IA ni credenciales AWS en este archivo.

## Integración implementada

- Autenticación contra Cognito: registro, confirmación de correo, inicio de sesión con `USER_PASSWORD_AUTH`, desafío de contraseña nueva y cierre de sesión. La sesión se conserva en `sessionStorage`.
- Perfil: `GET /auth/perfil`.
- Reportes: `POST /incidencias`, `GET /incidencias`, `GET /incidencias?zona={zoneId}`, `GET /incidencias?zona={zoneId}&tipo=colectivos`, `GET /incidencias/{id}`, `PATCH /incidencias/{id}/estado`, `GET /incidencias/metricas`.
- Notificaciones: `GET /v1/notifications?limit=20` y `PATCH /v1/notifications/{notificationId}/read`.
- Panel de operaciones: `GET /v1/telemetry/alerts?limit=8`, `GET /v1/coverage/zones?limit=30` y `GET /work-orders?limit=6`.
- Inventario y muestra de telemetría: `GET /antennas` y, para hasta ocho antenas, `GET /v1/telemetry/antennas/{antennaId}/latest`.
- Ayuda: `POST /soporte/chat` con `{ "mensaje": "..." }`.

Todas las llamadas autenticadas usan el ID token de Cognito en `Authorization`. El panel de operaciones se muestra para los grupos del backend `admin`, `supervisor_red`, `operador_soporte` y `tecnico_campo`. El operador puede filtrar por una zona de cobertura y elegir reportes individuales o incidentes colectivos. Sin zona, `GET /incidencias` devuelve solamente los reportes del usuario autenticado, según el contrato actual. Las acciones del backend siguen estando sujetas a sus authorizers y permisos, aunque un usuario intente abrir la vista manualmente.

Los paneles muestran estados vacíos cuando una API no está configurada o no contiene datos; no se rellenan con valores ficticios. El microservicio de infraestructura devuelve su inventario completo de antenas; el portal limita a ocho las consultas de última medición para no enviar una solicitud por cada elemento de la red. El resto de endpoints se consulta en la primera página que devuelven.

## Requisito de CORS

En el despliegue de los microservicios, configura `frontendOrigin` con el origen del frontend (por ejemplo, el dominio de CloudFront/S3 o `http://localhost:5173` para desarrollo). Las APIs deben admitir `Authorization` y los métodos `GET`, `POST` y `PATCH` usados por el portal. El frontend no hace llamadas directas a AWS con credenciales; Cognito entrega el token y cada API aplica su authorizer.


## Organización del código

```text
src/
  App.jsx                  # Composición y selección de la página
  main.jsx                 # Entrada de React
  api/client.js            # Cliente HTTP compartido
  config/                  # URLs de servicios y capas Esri
  services/                # Autenticación y consultas de cobertura
  hooks/                   # Estado y coordinación del portal y del mapa
  pages/                   # Autenticación, resumen, red, reportes, campo, avisos y ayuda
  components/
    common/                # Marca, tarjetas, encabezados y avisos
    layout/                # Sidebar, barra superior y pie
    reports/               # Listado y modales de reportes
    telemetry/             # Componentes de alertas
    map/                   # Mapa, marcadores, popups y analista
  models/                  # Normalización, estados y filtros de antenas
  utils/                   # Formatos, estados y etiquetas de navegación
  styles/                  # CSS global y del mapa
  tests/                   # Pruebas existentes
```

Esta separación conserva el JSX, las clases CSS, los estilos y las operaciones del portal. No añade rutas ni cambia contratos de API. `npm test` utiliza la nueva ubicación de las pruebas. Para agregar una pantalla, crearla en `pages/` y componer sus piezas con `components/`; las solicitudes compartidas pertenecen a `api/` y `services/`, y la coordinación de estado a `hooks/`.
