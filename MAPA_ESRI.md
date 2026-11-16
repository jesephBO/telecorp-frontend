# Mapa satelital de Red TeleCorp

Implementación en la rama `feature/redtelecorp-frontend-integration`, dentro del frontend existente React 19 + Vite. Se conservan el sidebar, las tarjetas, la tipografía y los colores. El mapa aparece en Vista general y Estado de red para los roles internos. El backend no se modificó; no se realizó push ni despliegue.

## Archivos y arquitectura

- `src/components/map/CoverageMap.jsx`: mapa React Leaflet 5, tres capas Esri, popups, detalle, filtros, impacto y asistente.
- `src/models/networkModel.js`: normalización de GeoJSON, clasificación, filtros y partición de bbox. La paginación y concurrencia están en `src/services/coverageService.js`.
- `src/styles/coverage-map.css`: estilos aislados del mapa y adaptación móvil.
- `src/tests/networkModel.test.js`: pruebas de límites y contratos.
- `src/App.jsx`: integración en ambas vistas, importación diferida y permisos con comparación exacta de grupos.
- `package.json` / `package-lock.json`: Leaflet, React Leaflet y agrupación de marcadores; comando `npm test`.
- `.env.example`: variables públicas necesarias. `.gitignore` excluye dependencias, build y configuración local.

La aplicación mantiene su cliente HTTP y su autenticación Cognito existentes. Las peticiones usan el ID token en `Authorization`. No se envían claves privadas de IA ni credenciales AWS desde el navegador.

## Contratos utilizados

| Servicio | Endpoint | Uso | Estado de la prueba real del 15/11/2026 |
|---|---|---|---|
| Cobertura | `GET /v1/coverage/antennas?bbox=...&limit=100&cursor=...` | Marcadores y radios | Implementado; HTTP 500 en prueba autenticada |
| Infraestructura | `GET /antennas` | Nombre, estado de inventario y `stationId` | Implementado; HTTP 500 en prueba autenticada |
| Infraestructura | `GET /stations` | Estación, zona y extensión inicial de búsqueda | Implementado; HTTP 500 en prueba autenticada |
| Telemetría | `GET /v1/telemetry/antennas/{antennaId}/latest` | Estado y última medición de cada antena del área | Implementado; prueba del mapa bloqueada por cobertura |
| Cobertura | `GET /v1/coverage/zones?limit=30` | Nombres de zona, reutiliza la consulta del dashboard | Reutilizado; no se verificó una nueva respuesta real satisfactoria |
| Cobertura | `POST /v1/coverage/impact-analysis` | Intersecciones y áreas afectadas | Implementado; sin ejecutar una operación real de escritura en esta revisión |
| Incidencias | `POST /soporte/chat` | Analista de Red (IA) | Implementado; HTTP 500 en prueba autenticada |

La autenticación Cognito de la cuenta de prueba respondió HTTP 200. Los HTTP 500 anteriores son respuestas de los servicios desplegados, independientes de la validación del frontend. No se afirma que estos flujos hayan pasado una prueba completa en producción.

## Coordenadas, radios y estados

La fuente geográfica es exclusivamente la colección GeoJSON de cobertura. `geometry.coordinates` viene en orden `[longitud, latitud]`; Leaflet recibe `[latitud, longitud]`. También se admite el par explícito de propiedades `longitude`/`latitude` cuando no hay geometría Point. Se descartan coordenadas ausentes, no numéricas o fuera del rango geográfico.

El handler `services/coverage-geospatial/handlers/put_antenna_coverage.py` valida y almacena `coverage_radius_m` en metros. Se convierte el Decimal serializado como texto a número, sin multiplicar por 1000. Sin ese campo válido no se dibuja un círculo ni se inventa un radio. Los círculos representan `ESTIMATED_CIRCLE`, no mediciones de propagación o intensidad de señal.

| Estado real de telemetría | Clasificación | Color |
|---|---|---|
| `NORMAL` | Operativa | Verde |
| `SATURATED` | Degradada | Naranja |
| `DOWN`, `DISABLED` | Falla / deshabilitada | Rojo |
| Sin medición, estado desconocido o consulta fallida | Sin información | Gris |

El estado `ACTIVE` de inventario se muestra por separado: no prueba que una antena tenga telemetría saludable. Se muestra la fecha de la última medición disponible, sin afirmar que los datos estén actualizándose en tiempo real.

## Búsqueda, rendimiento y permisos

El endpoint de antenas exige `bbox` y limita la consulta a 256 celdas de 0.1 grados. El frontend divide áreas grandes en rectángulos de hasta un grado, sigue los cursores opacos y elimina duplicados de los bordes. Rechaza búsquedas de más de 64 rectángulos con una indicación para acercar el mapa. Limita las peticiones simultáneas: tres áreas y seis consultas de telemetría.

La primera búsqueda utiliza la extensión real de las estaciones, con margen. Si no hay estaciones disponibles, consulta el área inicial de Lima. Se encuadran automáticamente las coordenadas recibidas. Al desplazar el mapa, «Consultar esta área» carga otra región; no se presenta el resultado como inventario mundial completo. Solo aparecen antenas que ya tienen cobertura registrada en el backend.

Los filtros por estado, zona y estación y la búsqueda por ID/nombre se intersectan sobre el área cargada. La opción Cobertura controla los círculos. «Encuadrar antenas» ajusta el mapa a los resultados filtrados. Con más de 200 marcadores se activa agrupación; los círculos usan el renderizador canvas de Leaflet. Las peticiones pendientes se cancelan al cambiar de área o desmontar la vista. Las capas se memoizan y el mapa se carga en un chunk separado.

Mapa y telemetría: `admin`, `supervisor_red`, `operador_soporte`, `tecnico_campo`. Impacto: `admin`, `supervisor_red`, `operador_soporte`. Los clientes no ven el mapa operativo. La autorización definitiva sigue aplicándose en las APIs.

## Impacto e IA

El formulario de impacto requiere el ID de una incidencia asociada y entre 1 y 30 antenas filtradas. Envía `{ incident_id, antenna_ids }` y muestra `affected_zones`, `criticality`, `estimated_affected_area_km2` y `oracle_status`. Esta operación guarda un artefacto de análisis en S3. Es análisis geométrico del backend, no una predicción de IA.

El Analista usa el endpoint público autorizado existente `POST /soporte/chat`, con el campo `mensaje` y la respuesta `respuesta`. Envía una instantánea acotada de antenas filtradas, estados observados, cantidad de alertas cargadas e impacto disponible; solicita explícitamente no inventar causas ni predicciones. El backend actual está diseñado como asistente de soporte conversacional. La interfaz explica esa capacidad y la necesidad de revisar sus respuestas. No se conecta directamente al Cloud Run privado ni inventa endpoints analíticos.

## Capas Esri y licencia

Orden obligatorio conservado:

1. `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
2. `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`
3. `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`

Los tres servicios de metadatos respondieron HTTP 200 sin token y las capas se visualizaron en Chrome. Esto no implica autorización irrestricta para uso comercial. Se conservan atribuciones de Esri y proveedores según `copyrightText` de cada servicio. Las referencias de Esri incluyen entre sus fuentes a colaboradores de OpenStreetMap: se conserva ese crédito legal; el proveedor y las tres capas siguen siendo exclusivamente Esri.

Según el [resumen oficial de condiciones de Esri, actualizado el 21/04/2025](https://goto.arcgis.com/termsofuse/viewsummary), deben atribuirse Esri y sus proveedores; para uso sin software Esri se requiere una suscripción ArcGIS Online, y el uso comercial de contenido Living Atlas requiere revisar su licencia con Esri. No se ha contratado ni verificado una suscripción de este proyecto. No se deben descargar masivamente ni redistribuir las teselas.

Esri [anunció el retiro de mapas heredados](https://www.esri.com/arcgis-blog/products/arcgis-living-atlas/announcements/sunsetting-legacy-basemaps): World Transportation está programado para marzo de 2028 y World Boundaries and Places para diciembre de 2029. Se mantienen las URL solicitadas; no se sustituyen por otro proveedor.

## Configuración y ejecución

`VITE_AWS_REGION` y `VITE_COGNITO_CLIENT_ID` configuran Cognito. `VITE_COVERAGE_BASE_URL`, `VITE_INFRASTRUCTURE_BASE_URL`, `VITE_TELEMETRY_BASE_URL`, `VITE_INCIDENTS_BASE_URL` alimentan el mapa y el analista. El resto del portal conserva `VITE_IDENTITY_BASE_URL`, `VITE_NOTIFICATIONS_BASE_URL` y `VITE_FIELD_BASE_URL`. No se necesitan variables nuevas de secretos.

Las URL de APIs REST incluyen `/dev`; las HTTP APIs de infraestructura y campo usan su URL raíz sin `/dev`. Si ya existe `.env`, conservar sus valores; `.env.local` tiene precedencia en Vite. Después de cambiar variables, reiniciar Vite; para hosting estático, volver a compilar y publicar `dist/`.

```sh
npm install
npm test
npm run build
npm run dev
```

Pendiente en AWS: permitir el origen exacto `http://localhost:5173` para desarrollo en todos los servicios implicados. Las pruebas OPTIONS de cobertura, telemetría y chat respondieron `https://example.com`; infraestructura respondió 204 sin `Access-Control-Allow-Origin`. El navegador bloquea esas respuestas. Configurar el origen en el despliegue del backend y desplegar nuevamente los servicios afectados; revisar también los HTTP 500. No se modifica CORS desde el frontend ni se añade un proxy para ocultar el problema.

## Validación

- Build Vite: satisfactorio.
- Pruebas de modelo: nueve satisfactorias (coordenadas, metros, estados, filtros, límites de área, cursores, duplicados, concurrencia y roles).
- `git diff --check`: satisfactorio.
- Interfaz real en Chrome: mapa Esri y tres capas visibles; filtros, controles, mensajes de error y secciones de impacto/IA renderizados. No se pudo comprobar con datos reales en el navegador debido a CORS y errores 500.
- Sin script de lint preexistente; no se informa un lint aprobado.
- Se consultó el contrato local del backend siguiendo la guía de APIs de Postman. CLI 1.74.0 devuelve `unknown command 'status'`; no se creó ni publicó un workspace de Postman y no se ejecutaron simulaciones de APIs.

Los fallos de conexión muestran avisos y no se sustituyen por antenas o resultados ficticios.
