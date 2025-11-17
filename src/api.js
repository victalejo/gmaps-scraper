const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { scrapeGoogleMapsReviews } = require('./scraper');
const jobManager = require('./jobManager');
const queueManager = require('./queueManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Documentación Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Google Maps Scraper API',
}));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Información general de la API
 *     description: Retorna información básica sobre la API y sus endpoints disponibles
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Información de la API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Google Maps Scraper API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 description:
 *                   type: string
 *                 endpoints:
 *                   type: object
 *                 documentation:
 *                   type: string
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Google Maps Scraper API',
    version: '1.0.0',
    description: 'API REST para scraping de reseñas de Google Maps',
    endpoints: {
      'POST /api/scrape': 'Iniciar un nuevo job de scraping',
      'GET /api/status/:jobId': 'Consultar el estado de un job',
      'GET /api/results/:jobId': 'Obtener los resultados de un job completado',
      'GET /api/stats': 'Estadísticas del sistema',
      'GET /api/jobs/errors': 'Listar todos los jobs con error',
      'GET /api/queue/info': 'Información de la cola de procesamiento',
      'DELETE /api/queue/clear': 'Vaciar la cola de procesamiento',
    },
    documentation: 'http://localhost:3000/docs',
  });
});

/**
 * @swagger
 * /api/scrape:
 *   post:
 *     summary: Iniciar un nuevo job de scraping
 *     description: Crea un nuevo job de scraping de reseñas de Google Maps. El job se ejecuta de forma asíncrona en segundo plano.
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScrapeRequest'
 *     responses:
 *       202:
 *         description: Job creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapeResponse'
 *       400:
 *         description: Error de validación en los parámetros
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/scrape', async (req, res) => {
  try {
    const { businessUrl, maxReviews = 50 } = req.body;

    // Validar businessUrl
    if (!businessUrl) {
      return res.status(400).json({
        error: 'Missing required field: businessUrl',
        message: 'Debes proporcionar la URL del negocio en Google Maps',
      });
    }

    // Validar que sea una URL de Google Maps
    if (!businessUrl.includes('google.com/maps')) {
      return res.status(400).json({
        error: 'Invalid businessUrl',
        message: 'La URL debe ser de Google Maps',
      });
    }

    // Validar maxReviews
    if (typeof maxReviews !== 'number' || maxReviews < 1 || maxReviews > 1000) {
      return res.status(400).json({
        error: 'Invalid maxReviews',
        message: 'maxReviews debe ser un número entre 1 y 1000',
      });
    }

    // Crear job
    const jobId = jobManager.createJob(businessUrl, maxReviews);

    // Iniciar scraping en background usando la cola (sin await)
    executeScraping(jobId, businessUrl, maxReviews);

    // Obtener posición en cola
    const job = jobManager.getJob(jobId);
    const queueInfo = queueManager.getInfo();

    // Responder inmediatamente con el jobId
    res.status(202).json({
      message: 'Scraping job encolado',
      jobId,
      status: 'queued',
      queuePosition: job.queuePosition,
      queueInfo: {
        activeJobs: queueInfo.activeJobs,
        queuedJobs: queueInfo.queuedJobs,
        estimatedWaitMessage: queueInfo.activeJobs > 0
          ? `Hay ${queueInfo.activeJobs} job(s) ejecutándose y ${queueInfo.queuedJobs} esperando`
          : 'Tu job se ejecutará inmediatamente',
      },
      statusUrl: `/api/status/${jobId}`,
      resultsUrl: `/api/results/${jobId}`,
    });

  } catch (error) {
    console.error('Error al crear job:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/status/{jobId}:
 *   get:
 *     summary: Consultar estado de un job
 *     description: Obtiene el estado actual de un job de scraping, incluyendo su progreso y paso actual
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del job
 *         example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 *     responses:
 *       200:
 *         description: Estado del job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobStatus'
 *       404:
 *         description: Job no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;

  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No se encontró el job con ID: ${jobId}`,
    });
  }

  // Retornar estado sin los resultados completos (para reducir payload)
  res.json({
    id: job.id,
    status: job.status,
    businessUrl: job.businessUrl,
    maxReviews: job.maxReviews,
    progress: job.progress,
    currentStep: job.currentStep,
    reviewsExtracted: job.reviewsExtracted,
    queuePosition: job.queuePosition || null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  });
});

/**
 * @swagger
 * /api/results/{jobId}:
 *   get:
 *     summary: Obtener resultados de un job
 *     description: Obtiene los resultados completos de un job de scraping. Si el job no está completado, retorna el estado actual.
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del job
 *         example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 *     responses:
 *       200:
 *         description: Resultados del job o estado actual
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/JobResults'
 *                 - $ref: '#/components/schemas/JobStatus'
 *       404:
 *         description: Job no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/results/:jobId', (req, res) => {
  const { jobId } = req.params;

  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No se encontró el job con ID: ${jobId}`,
    });
  }

  // Si el job no está completado, retornar el estado actual
  if (job.status !== 'completed') {
    return res.status(200).json({
      id: job.id,
      status: job.status,
      message: job.status === 'running'
        ? `El job está en progreso (${job.progress}%)`
        : job.status === 'pending'
        ? 'El job está en cola'
        : 'El job falló',
      progress: job.progress,
      currentStep: job.currentStep,
      error: job.error,
    });
  }

  // Retornar resultados completos
  res.json({
    id: job.id,
    status: job.status,
    businessUrl: job.businessUrl,
    completedAt: job.completedAt,
    results: job.results,
  });
});

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Estadísticas del sistema
 *     description: Obtiene estadísticas generales del sistema de jobs
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stats'
 */
app.get('/api/stats', (req, res) => {
  const stats = jobManager.getStats();
  res.json(stats);
});

/**
 * @swagger
 * /api/jobs/errors:
 *   get:
 *     summary: Obtener jobs con error
 *     description: Retorna la lista de todos los jobs que terminaron con error, incluyendo detalles del error
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Lista de jobs con error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorJobsResponse'
 */
app.get('/api/jobs/errors', (req, res) => {
  const errorJobs = jobManager.getErrorJobs();

  // Mapear a formato de respuesta limpio
  const response = errorJobs.map(job => ({
    id: job.id,
    businessUrl: job.businessUrl,
    maxReviews: job.maxReviews,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    progress: job.progress,
    currentStep: job.currentStep,
    reviewsExtracted: job.reviewsExtracted,
    error: job.error,
  }));

  res.json({
    count: response.length,
    jobs: response,
  });
});

/**
 * @swagger
 * /api/queue/info:
 *   get:
 *     summary: Información de la cola de procesamiento
 *     description: Obtiene información sobre el estado actual de la cola de jobs
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Información de la cola
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeJobs:
 *                   type: number
 *                   description: Jobs actualmente ejecutándose
 *                 queuedJobs:
 *                   type: number
 *                   description: Jobs esperando en cola
 *                 totalJobs:
 *                   type: number
 *                   description: Total de jobs (activos + en cola)
 *                 maxConcurrency:
 *                   type: number
 *                   description: Número máximo de jobs concurrentes permitidos
 *                 stats:
 *                   type: object
 *                   description: Estadísticas históricas de la cola
 */
app.get('/api/queue/info', (req, res) => {
  const queueInfo = queueManager.getInfo();

  res.json({
    activeJobs: queueInfo.activeJobs,
    queuedJobs: queueInfo.queuedJobs,
    totalJobs: queueInfo.totalJobs,
    maxConcurrency: queueInfo.maxConcurrency,
    isPaused: queueInfo.isPaused,
    isIdle: queueInfo.isIdle,
    stats: queueInfo.stats,
    message: queueInfo.isIdle
      ? 'La cola está vacía'
      : `${queueInfo.activeJobs} job(s) ejecutándose, ${queueInfo.queuedJobs} esperando`,
  });
});

/**
 * @swagger
 * /api/queue/clear:
 *   delete:
 *     summary: Vaciar la cola de procesamiento
 *     description: Elimina todos los jobs pendientes en la cola. Los jobs que ya están ejecutándose NO se afectan.
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Cola vaciada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cola vaciada exitosamente
 *                 jobsCleared:
 *                   type: number
 *                   description: Número de jobs cancelados
 *                 activeJobsNotAffected:
 *                   type: number
 *                   description: Jobs activos que no fueron afectados
 *                 queueInfo:
 *                   type: object
 *                   description: Estado actual de la cola
 */
app.delete('/api/queue/clear', (req, res) => {
  try {
    const result = jobManager.clearQueue();

    res.json({
      message: 'Cola vaciada exitosamente',
      jobsCleared: result.jobsCleared,
      activeJobsNotAffected: result.activeJobsNotAffected,
      queueInfo: result.queueInfo,
    });
  } catch (error) {
    console.error('Error al vaciar la cola:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Ejecuta el scraping en background usando la cola
 * @param {string} jobId - ID del job
 * @param {string} businessUrl - URL del negocio
 * @param {number} maxReviews - Número máximo de reseñas
 */
async function executeScraping(jobId, businessUrl, maxReviews) {
  // Encolar el job usando jobManager.executeJob
  // No usamos await aquí para retornar inmediatamente al cliente
  jobManager.executeJob(jobId, async () => {
    try {
      // Marcar job como iniciado (ya se hace en executeJob, pero lo dejamos por si acaso)
      jobManager.startJob(jobId);

      // Ejecutar scraping con callbacks de progreso
      const results = await scrapeGoogleMapsReviewsWithProgress(
        businessUrl,
        maxReviews,
        jobId
      );

      // Preparar resultados
      const resultData = {
        scrapedAt: new Date().toISOString(),
        totalReviews: results.length,
        reviews: results,
        summary: {
          withPhotos: results.filter(r => r.photos && r.photos.length > 0).length,
          withOwnerResponse: results.filter(r => r.ownerResponse).length,
          withAdditionalInfo: results.filter(r => r.additionalInfo).length,
        },
      };

      // Marcar job como completado
      jobManager.completeJob(jobId, resultData);

    } catch (error) {
      console.error(`Error en scraping job ${jobId}:`, error);
      jobManager.failJob(jobId, error);
    }
  }).catch(error => {
    // Manejar errores de encolado
    console.error(`Error al encolar job ${jobId}:`, error);
    jobManager.failJob(jobId, error);
  });
}

/**
 * Wrapper del scraper con callbacks de progreso
 */
async function scrapeGoogleMapsReviewsWithProgress(businessUrl, maxReviews, jobId) {
  // Callback para actualizar progreso
  const progressCallback = (progress, step, reviewsCount) => {
    jobManager.updateProgress(jobId, progress, step, reviewsCount);
  };

  // Llamar al scraper con el callback
  const results = await scrapeGoogleMapsReviews(businessUrl, maxReviews, progressCallback);

  return results;
}

/**
 * Manejo de errores 404
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint no encontrado: ${req.method} ${req.path}`,
  });
});

/**
 * Manejo de errores global
 */
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

/**
 * Iniciar servidor
 */
app.listen(PORT, () => {
  console.log('\n=== Google Maps Scraper API ===');
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`Estado del sistema: http://localhost:${PORT}/api/stats`);
  console.log(`Cola de procesamiento: http://localhost:${PORT}/api/queue/info`);
  console.log('\nEndpoints disponibles:');
  console.log(`  POST   http://localhost:${PORT}/api/scrape`);
  console.log(`  GET    http://localhost:${PORT}/api/status/:jobId`);
  console.log(`  GET    http://localhost:${PORT}/api/results/:jobId`);
  console.log(`  GET    http://localhost:${PORT}/api/stats`);
  console.log(`  GET    http://localhost:${PORT}/api/queue/info`);
  console.log(`  DELETE http://localhost:${PORT}/api/queue/clear`);
  console.log(`  GET    http://localhost:${PORT}/api/jobs/errors`);
  console.log('\nConcurrencia máxima: 1 job a la vez (configurable en queueManager.js)');
  console.log('Presiona Ctrl+C para detener el servidor\n');
});

module.exports = app;
