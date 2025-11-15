# Guía de Uso de la API

## Iniciar el Servidor

```bash
npm start
# o
npm run dev
# o
node src/api.js
```

El servidor está disponible en `https://apigmaps.dinerboost.com`.

## 📖 Documentación Interactiva (Swagger)

Una vez iniciado el servidor, puedes acceder a la documentación interactiva en:

**<https://apigmaps.dinerboost.com/docs>**

La documentación Swagger te permite:
- Ver todos los endpoints disponibles con sus parámetros
- Probar los endpoints directamente desde el navegador
- Ver ejemplos de peticiones y respuestas
- Explorar los esquemas de datos

## Endpoints Disponibles

### 1. Información de la API

```bash
GET https://apigmaps.dinerboost.com/
```

Retorna información general sobre la API y sus endpoints.

### 2. Iniciar Scraping

```bash
POST https://apigmaps.dinerboost.com/api/scrape
Content-Type: application/json

{
  "businessUrl": "https://www.google.com/maps/place/...",
  "maxReviews": 50
}
```

**Parámetros:**
- `businessUrl` (requerido): URL completa del negocio en Google Maps
- `maxReviews` (opcional): Número máximo de reseñas a extraer (default: 50, max: 1000)

**Respuesta (202 Accepted):**
```json
{
  "message": "Scraping job iniciado",
  "jobId": "a1b2c3d4e5f6...",
  "status": "pending",
  "statusUrl": "/api/status/a1b2c3d4e5f6...",
  "resultsUrl": "/api/results/a1b2c3d4e5f6..."
}
```

### 3. Consultar Estado del Job

```bash
GET https://apigmaps.dinerboost.com/api/status/:jobId
```

**Respuesta:**
```json
{
  "id": "a1b2c3d4e5f6...",
  "status": "running",
  "businessUrl": "https://www.google.com/maps/place/...",
  "maxReviews": 50,
  "progress": 45,
  "currentStep": "Cargando reseñas mediante scroll",
  "reviewsExtracted": 32,
  "createdAt": "2025-11-14T10:30:00.000Z",
  "startedAt": "2025-11-14T10:30:01.000Z",
  "completedAt": null,
  "error": null
}
```

**Estados posibles:**
- `pending`: Job en cola, esperando inicio
- `running`: Job en ejecución
- `completed`: Job completado exitosamente
- `error`: Job falló

### 4. Obtener Resultados

```bash
GET https://apigmaps.dinerboost.com/api/results/:jobId
```

**Respuesta (si está completado):**
```json
{
  "id": "a1b2c3d4e5f6...",
  "status": "completed",
  "businessUrl": "https://www.google.com/maps/place/...",
  "completedAt": "2025-11-14T10:35:00.000Z",
  "results": {
    "scrapedAt": "2025-11-14T10:35:00.000Z",
    "totalReviews": 50,
    "reviews": [
      {
        "reviewId": "...",
        "reviewerName": "Juan Pérez",
        "isLocalGuide": true,
        "reviewCount": 150,
        "photoCount": 45,
        "rating": 5,
        "reviewText": "Excelente lugar...",
        "reviewDate": "hace 2 meses",
        "profilePhotoUrl": "https://...",
        "photos": ["https://...", "https://..."],
        "ownerResponse": {
          "text": "Gracias por tu visita!",
          "date": "hace 1 mes"
        },
        "additionalInfo": {
          "pricePerPerson": "$100-200",
          "foodRating": "5",
          "serviceRating": "5",
          "atmosphereRating": "4"
        }
      }
    ],
    "summary": {
      "withPhotos": 35,
      "withOwnerResponse": 20,
      "withAdditionalInfo": 40
    }
  }
}
```

### 5. Estadísticas del Sistema

```bash
GET https://apigmaps.dinerboost.com/api/stats
```

**Respuesta:**
```json
{
  "total": 10,
  "pending": 2,
  "running": 1,
  "completed": 6,
  "error": 1,
  "maxJobs": 1000
}
```

## Ejemplos con cURL

### Iniciar un scraping

```bash
curl -X POST https://apigmaps.dinerboost.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "businessUrl": "https://www.google.com/maps/place/Bellas+Artes/@19.4352,-99.1412,17z",
    "maxReviews": 100
  }'
```

### Consultar estado

```bash
curl https://apigmaps.dinerboost.com/api/status/JOBID_AQUI
```

### Obtener resultados

```bash
curl https://apigmaps.dinerboost.com/api/results/JOBID_AQUI
```

## Ejemplos con JavaScript (fetch)

```javascript
// 1. Iniciar scraping
const response = await fetch('https://apigmaps.dinerboost.com/api/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    businessUrl: 'https://www.google.com/maps/place/...',
    maxReviews: 50,
  }),
});

const { jobId } = await response.json();
console.log('Job iniciado:', jobId);

// 2. Consultar estado cada 5 segundos
const checkStatus = setInterval(async () => {
  const statusResponse = await fetch(`https://apigmaps.dinerboost.com/api/status/${jobId}`);
  const status = await statusResponse.json();

  console.log(`Progreso: ${status.progress}% - ${status.currentStep}`);

  if (status.status === 'completed') {
    clearInterval(checkStatus);

    // 3. Obtener resultados
    const resultsResponse = await fetch(`https://apigmaps.dinerboost.com/api/results/${jobId}`);
    const results = await resultsResponse.json();

    console.log('Resultados:', results);
  } else if (status.status === 'error') {
    clearInterval(checkStatus);
    console.error('Error:', status.error);
  }
}, 5000);
```

## Modo CLI (sin API)

Si prefieres usar el scraper en modo CLI tradicional:

```bash
npm run scrape "https://www.google.com/maps/place/..." 50
# o
node src/scraper.js "https://www.google.com/maps/place/..." 50
```

Los resultados se guardarán automáticamente en `output/reviews_TIMESTAMP.json`.

## Configuración

### Puerto del Servidor

Por defecto el servidor corre en el puerto 3000. Para cambiarlo:

```bash
PORT=8080 npm start
```

### Modo Headless

El navegador está configurado en modo headless (sin interfaz gráfica). Esto está configurado en [src/scraper.js:30](src/scraper.js#L30):

```javascript
browser = await chromium.launch({
  headless: true,  // true = sin interfaz, false = con interfaz visible
});
```

## Notas Importantes

1. **Jobs en Memoria**: Los jobs se almacenan en memoria y se eliminan después de 24 horas. Para producción, considera usar Redis o una base de datos.

2. **Límite de Jobs**: Máximo 1000 jobs almacenados simultáneamente (configurable en [src/jobManager.js:12](src/jobManager.js#L12)).

3. **Timeouts**: Los jobs pueden tomar varios minutos dependiendo del número de reseñas solicitadas.

4. **Rate Limiting**: Google puede bloquear requests si se hacen demasiadas solicitudes. Considera implementar rate limiting.

5. **Términos de Servicio**: El scraping de Google Maps puede violar sus términos de servicio. Úsalo bajo tu propia responsabilidad.
