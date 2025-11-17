const crypto = require('crypto');
const queueManager = require('./queueManager');

/**
 * Sistema de gestión de jobs para scraping asíncrono
 */
class JobManager {
  constructor() {
    // Almacenar jobs en memoria (en producción considerar Redis o base de datos)
    this.jobs = new Map();

    // Límite de jobs almacenados (para evitar fugas de memoria)
    this.maxJobs = 1000;

    // Tiempo de expiración de jobs completados (24 horas)
    this.jobExpirationMs = 24 * 60 * 60 * 1000;
  }

  /**
   * Crea un nuevo job
   * @param {string} businessUrl - URL del negocio a scrapear
   * @param {number} maxReviews - Número máximo de reseñas
   * @returns {string} jobId - ID único del job creado
   */
  createJob(businessUrl, maxReviews) {
    // Generar ID único
    const jobId = crypto.randomBytes(16).toString('hex');

    // Crear job con estado inicial
    const job = {
      id: jobId,
      status: 'queued', // queued, running, completed, error
      businessUrl,
      maxReviews,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      progress: 0, // Porcentaje de progreso (0-100)
      currentStep: 'En cola de espera',
      results: null,
      error: null,
      reviewsExtracted: 0,
      queuePosition: null, // Posición en la cola (se actualiza después)
    };

    // Limpiar jobs antiguos si hay demasiados
    if (this.jobs.size >= this.maxJobs) {
      this.cleanupOldJobs();
    }

    this.jobs.set(jobId, job);

    console.log(`[JobManager] Job creado: ${jobId}`);
    return jobId;
  }

  /**
   * Ejecuta un job usando la cola de procesamiento
   * @param {string} jobId - ID del job
   * @param {Function} executionFunction - Función async que ejecuta el scraping
   */
  async executeJob(jobId, executionFunction) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} no encontrado`);
    }

    // Actualizar posición en cola antes de encolar
    const queueInfo = queueManager.getInfo();
    job.queuePosition = queueInfo.totalJobs + 1;

    console.log(`[JobManager] Job ${jobId} encolado en posición ${job.queuePosition}`);

    // Encolar el job
    await queueManager.add(async () => {
      try {
        // Actualizar estado a running cuando sale de la cola
        job.status = 'running';
        job.queuePosition = 0;

        console.log(`[JobManager] Job ${jobId} iniciando ejecución desde la cola`);

        // Ejecutar la función de scraping
        await executionFunction();
      } catch (error) {
        console.error(`[JobManager] Error ejecutando job ${jobId}:`, error);
        throw error; // Re-lanzar para que la cola lo maneje
      }
    });
  }

  /**
   * Actualiza la posición en cola de un job
   * @param {string} jobId - ID del job
   */
  updateQueuePosition(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return;

    const queueInfo = queueManager.getInfo();
    job.queuePosition = queueInfo.queuedJobs;
  }

  /**
   * Obtiene el estado de un job
   * @param {string} jobId - ID del job
   * @returns {Object|null} job - Objeto del job o null si no existe
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Marca un job como iniciado
   * @param {string} jobId - ID del job
   */
  startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.currentStep = 'Iniciando navegador';
    job.progress = 5;

    console.log(`[JobManager] Job iniciado: ${jobId}`);
  }

  /**
   * Actualiza el progreso de un job
   * @param {string} jobId - ID del job
   * @param {number} progress - Porcentaje de progreso (0-100)
   * @param {string} step - Descripción del paso actual
   * @param {number} reviewsExtracted - Número de reseñas extraídas hasta ahora
   */
  updateProgress(jobId, progress, step, reviewsExtracted = 0) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    job.currentStep = step;
    job.reviewsExtracted = reviewsExtracted;

    console.log(`[JobManager] Job ${jobId}: ${progress}% - ${step}`);
  }

  /**
   * Marca un job como completado
   * @param {string} jobId - ID del job
   * @param {Object} results - Resultados del scraping
   */
  completeJob(jobId, results) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.progress = 100;
    job.currentStep = 'Completado';
    job.results = results;
    job.reviewsExtracted = results.reviews ? results.reviews.length : 0;

    console.log(`[JobManager] Job completado: ${jobId} - ${job.reviewsExtracted} reseñas`);

    // Programar limpieza del job después del tiempo de expiración
    setTimeout(() => {
      if (this.jobs.has(jobId)) {
        this.jobs.delete(jobId);
        console.log(`[JobManager] Job expirado y eliminado: ${jobId}`);
      }
    }, this.jobExpirationMs);
  }

  /**
   * Marca un job como fallido
   * @param {string} jobId - ID del job
   * @param {Error} error - Error que causó la falla
   */
  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'error';
    job.completedAt = new Date().toISOString();
    job.error = {
      message: error.message,
      stack: error.stack,
    };

    console.error(`[JobManager] Job fallido: ${jobId} - ${error.message}`);
  }

  /**
   * Obtiene todos los jobs (útil para debug/admin)
   * @returns {Array} Lista de todos los jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Limpia jobs antiguos completados o fallidos
   */
  cleanupOldJobs() {
    const now = Date.now();
    const jobsToDelete = [];

    for (const [jobId, job] of this.jobs.entries()) {
      // Eliminar jobs completados o fallidos que hayan expirado
      if ((job.status === 'completed' || job.status === 'error') && job.completedAt) {
        const completedAt = new Date(job.completedAt).getTime();
        if (now - completedAt > this.jobExpirationMs) {
          jobsToDelete.push(jobId);
        }
      }
    }

    jobsToDelete.forEach(jobId => {
      this.jobs.delete(jobId);
      console.log(`[JobManager] Job antiguo limpiado: ${jobId}`);
    });

    console.log(`[JobManager] Limpieza completada. Jobs eliminados: ${jobsToDelete.length}`);
  }

  /**
   * Obtiene estadísticas del sistema
   * @returns {Object} Estadísticas
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    const queueInfo = queueManager.getInfo();

    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      error: jobs.filter(j => j.status === 'error').length,
      maxJobs: this.maxJobs,
      // Información de la cola
      queue: {
        activeJobs: queueInfo.activeJobs,
        queuedJobs: queueInfo.queuedJobs,
        maxConcurrency: queueInfo.maxConcurrency,
        stats: queueInfo.stats,
      },
    };
  }

  /**
   * Obtiene todos los jobs que tienen error
   * @returns {Array} Lista de jobs con status 'error'
   */
  getErrorJobs() {
    const jobs = Array.from(this.jobs.values());
    return jobs.filter(j => j.status === 'error');
  }

  /**
   * Vacía la cola de procesamiento y marca jobs en cola como cancelados
   * NO afecta jobs que ya están ejecutándose
   * @returns {Object} Información de los jobs eliminados
   */
  clearQueue() {
    const jobs = Array.from(this.jobs.values());

    // Contar jobs en cola antes de limpiar
    const queuedJobsBefore = jobs.filter(j => j.status === 'queued').length;
    const activeJobsBefore = jobs.filter(j => j.status === 'running').length;

    // Vaciar la cola de p-queue (elimina jobs pendientes)
    queueManager.clear();

    // Marcar jobs en estado "queued" como cancelados
    let jobsCancelled = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'queued') {
        job.status = 'error';
        job.completedAt = new Date().toISOString();
        job.error = {
          message: 'Job cancelado - cola vaciada',
          stack: null,
        };
        job.currentStep = 'Cancelado';
        jobsCancelled++;

        console.log(`[JobManager] Job cancelado: ${jobId}`);
      }
    }

    const queueInfo = queueManager.getInfo();

    console.log(`[JobManager] Cola vaciada. Jobs cancelados: ${jobsCancelled}, Jobs activos no afectados: ${activeJobsBefore}`);

    return {
      jobsCleared: jobsCancelled,
      activeJobsNotAffected: activeJobsBefore,
      queueInfo: {
        activeJobs: queueInfo.activeJobs,
        queuedJobs: queueInfo.queuedJobs,
      },
    };
  }
}

// Exportar instancia singleton
const jobManager = new JobManager();

module.exports = jobManager;
