# Google Maps Reviews Scraper

Scraper automatizado de reseñas de Google Maps usando Playwright. Disponible como **API REST** o **herramienta CLI**. Extrae información detallada de reseñas incluyendo comentarios, calificaciones, fotos, respuestas del local y datos adicionales.

## 🆕 Novedades

- ✨ **API REST**: Ahora puedes usar el scraper como una API REST con scraping asíncrono
- ✨ **Modo Headless**: El navegador se ejecuta sin interfaz gráfica (más rápido y eficiente)
- ✨ **Jobs Asíncronos**: Inicia múltiples scraping jobs y consulta su progreso en tiempo real
- ✨ **Doble Modo**: Usa la API REST o el modo CLI tradicional según tus necesidades

## Características

- ✅ **API REST** con endpoints para scraping asíncrono
- ✅ **Modo Headless** (navegador sin interfaz gráfica)
- ✅ Extrae reseñas ordenadas por "Más recientes"
- ✅ Scroll automático para cargar más reseñas
- ✅ Expansión automática de reseñas truncadas
- ✅ Extrae información completa de cada reseña:
  - Nombre del reviewer
  - Foto de perfil
  - Calificación (estrellas)
  - Texto completo del comentario
  - Fecha de publicación
  - ID de la reseña
  - Fotos adjuntas
  - Respuesta del propietario (si existe)
  - Información adicional (restaurantes):
    - Precio por persona
    - Calificación de comida, servicio y ambiente
    - Reservas, nivel de ruido, tiempo de espera
- ✅ Salida en formato JSON estructurado
- ✅ Manejo robusto de errores

## Requisitos

- Node.js 14 o superior
- npm o yarn

## Instalación

1. Navega al directorio del proyecto:

```bash
cd gmaps-scraper
```

2. Instala las dependencias:

```bash
npm install
```

3. Instala el navegador Chromium para Playwright:

```bash
npm run install-browser
```

## Uso

### Modo 1: API REST (Recomendado) 🚀

**Iniciar el servidor:**

```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`.

**Ejemplo de uso con cURL:**

```bash
# 1. Iniciar scraping
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "businessUrl": "https://www.google.com/maps/place/...",
    "maxReviews": 100
  }'

# Respuesta: { "jobId": "abc123...", "statusUrl": "/api/status/abc123..." }

# 2. Consultar estado
curl http://localhost:3000/api/status/abc123...

# 3. Obtener resultados cuando esté completado
curl http://localhost:3000/api/results/abc123...
```

**Endpoints disponibles:**

- `POST /api/scrape` - Iniciar un job de scraping
- `GET /api/status/:jobId` - Consultar estado de un job
- `GET /api/results/:jobId` - Obtener resultados de un job
- `GET /api/stats` - Estadísticas del sistema
- `GET /docs` - Documentación interactiva Swagger

📖 **Documentación interactiva:** http://localhost:3000/docs (después de iniciar el servidor)

📖 **Ver [API_USAGE.md](API_USAGE.md) para documentación completa de la API**

### Modo 2: CLI (Tradicional)

**Sintaxis básica:**

```bash
npm run scrape "<URL_GOOGLE_MAPS>" [NUM_RESEÑAS]
```

**Ejemplos:**

```bash
# Extraer 50 reseñas (default)
npm run scrape "https://www.google.com/maps/place/BTK+Tecnológico/@19.4881454,-99.1431916,17z/..."

# Extraer 100 reseñas
npm run scrape "https://www.google.com/maps/place/BTK+Tecnológico/@19.4881454,-99.1431916,17z/..." 100

# Extraer todas las reseñas disponibles
npm run scrape "https://www.google.com/maps/place/..." 1000
```

Los resultados se guardan automáticamente en `output/reviews_TIMESTAMP.json`.

> Nota: Si solicitas más reseñas de las disponibles, el scraper extraerá todas las que encuentre.

## Cómo obtener la URL de Google Maps

1. Busca el negocio en Google Maps
2. Haz clic en el negocio para abrir su ficha
3. Copia la URL completa de la barra de direcciones

Ejemplo de URL válida:
```
https://www.google.com/maps/place/BTK+Tecnológico/@19.4881454,-99.1431916,17z/data=!3m1!4b1!4m6!3m5!1s0x85d1ff35f5c5c5c5:0x1234567890abcdef!8m2!3d19.4881454!4d-99.1406167!16s%2Fg%2F11c1234567
```

## Estructura de salida

Los datos se guardan en la carpeta `output/` con el nombre `reviews_YYYY-MM-DD-HH-MM-SS.json`.

### Ejemplo de estructura JSON:

```json
{
  "scrapedAt": "2025-01-15T10:30:00.000Z",
  "totalReviews": 50,
  "reviews": [
    {
      "reviewId": "ChdDSUhNMG9nS0VJQ0FnSUR...",
      "reviewerName": "Juan Pérez",
      "rating": 5,
      "reviewText": "Excelente lugar, muy buena comida y ambiente agradable...",
      "reviewDate": "hace 2 semanas",
      "profilePhotoUrl": "https://lh3.googleusercontent.com/...",
      "photos": [
        "https://lh5.googleusercontent.com/p/...",
        "https://lh5.googleusercontent.com/p/..."
      ],
      "ownerResponse": {
        "text": "¡Gracias por tu visita! Esperamos verte pronto",
        "date": "hace 1 semana"
      },
      "additionalInfo": {
        "pricePerPerson": "$100-200",
        "foodRating": 5,
        "serviceRating": 5,
        "atmosphereRating": 5,
        "reservations": "No se requiere hacer una reserva",
        "noiseLevel": "Silencioso, agradable para conversar",
        "waitTime": "Más de 1 hora"
      }
    }
  ]
}
```

### Campos de la reseña

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `reviewId` | string | ID único de la reseña |
| `reviewerName` | string | Nombre del usuario que dejó la reseña |
| `rating` | number | Calificación en estrellas (1-5) |
| `reviewText` | string | Texto completo del comentario |
| `reviewDate` | string | Fecha de publicación |
| `profilePhotoUrl` | string | URL de la foto de perfil del usuario |
| `photos` | array | URLs de las fotos adjuntas a la reseña |
| `ownerResponse` | object/null | Respuesta del propietario (texto + fecha) |
| `additionalInfo` | object/null | Información adicional del negocio |

## Configuración

### Modo headless

Por defecto, el navegador se ejecuta en **modo headless** (sin interfaz gráfica). Esto está configurado en [src/scraper.js:27](src/scraper.js#L27):

```javascript
browser = await chromium.launch({
  headless: true,  // true = sin interfaz, false = con interfaz visible
});
```

### Puerto del servidor API

Por defecto el servidor corre en el puerto 3000. Para cambiarlo:

```bash
PORT=8080 npm start
```

### Timeouts y delays

Los tiempos de espera se pueden ajustar en `src/utils.js`:

```javascript
await page.waitForTimeout(2000); // Milisegundos
```

### Selectores CSS

Si Google actualiza su interfaz, los selectores pueden necesitar actualizarse en `src/selectors.js`.

## Solución de problemas

### Error: "No se encontraron reseñas"

- Verifica que la URL sea correcta y contenga `google.com/maps`
- Asegúrate de que el negocio tenga reseñas públicas
- Intenta con una URL más corta (solo hasta el nombre del lugar)

### Error: "Selector no encontrado"

- Google puede haber actualizado su interfaz
- Verifica los selectores en `src/selectors.js`
- Ejecuta en modo no-headless para ver qué sucede

### El scraper se detiene antes de tiempo

- Puede que no haya más reseñas disponibles
- Intenta aumentar los tiempos de espera en `utils.js`
- Verifica la conexión a internet

### Reseñas truncadas

- El script intenta expandir automáticamente todas las reseñas
- Si algunas siguen truncadas, aumenta el delay en `expandAllReviews()`

## Limitaciones

1. **Términos de servicio**: Este scraper es para uso educativo. Google prohibe el scraping automatizado en sus TOS.
2. **Rate limiting**: Ejecutar el scraper muchas veces seguidas puede resultar en bloqueos temporales.
3. **Selectores volátiles**: Google cambia frecuentemente los nombres de clase CSS.
4. **CAPTCHA**: Puede aparecer si Google detecta automatización.
5. **Campos opcionales**: No todas las reseñas tienen todos los campos (fotos, respuesta del local, etc.).
6. **Jobs en memoria**: Los jobs de la API se almacenan en memoria y se pierden al reiniciar el servidor. Para producción, considera usar Redis o una base de datos.

## Alternativas oficiales

Para uso en producción, considera usar:

- **Google Places API**: API oficial con acceso a reseñas (limitado a 5 por lugar)
- **Google My Business API**: Para negocios verificados
- **SerpAPI / Outscraper**: Servicios de terceros con APIs dedicadas

## Estructura del proyecto

```
gmaps-scraper/
├── src/
│   ├── api.js          # Servidor Express (API REST)
│   ├── jobManager.js   # Gestión de jobs asíncronos
│   ├── scraper.js      # Lógica principal de scraping
│   ├── utils.js        # Funciones auxiliares de scraping
│   └── selectors.js    # Selectores CSS de Google Maps
├── output/             # Archivos JSON de salida (modo CLI)
├── package.json        # Dependencias y scripts
├── API_USAGE.md        # Documentación de la API REST
└── README.md          # Este archivo
```

## Contribuciones

Las contribuciones son bienvenidas, especialmente para:

- Actualizar selectores CSS cuando Google cambie su interfaz
- Mejorar el manejo de errores
- Agregar soporte para más campos de datos
- Optimizar el rendimiento del scroll

## Licencia

MIT

## Descargo de responsabilidad

Este proyecto es solo para fines educativos. El uso de scrapers puede violar los términos de servicio de Google Maps. Úsalo bajo tu propia responsabilidad y considera usar las APIs oficiales para aplicaciones en producción.
