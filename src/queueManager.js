const PQueue = require('p-queue').default;

/**
 * Queue Manager - Controla la concurrencia de jobs de scraping
 * Limita el número de browsers ejecutándose simultáneamente para reducir uso de CPU
 */
class QueueManager {
  constructor() {
    // Límite hardcodeado de jobs concurrentes
    // Cambiar este valor para permitir más jobs simultáneos
    const MAX_CONCURRENT_JOBS = 1;

    this.queue = new PQueue({
      concurrency: MAX_CONCURRENT_JOBS,
      autoStart: true
    });

    // Estadísticas de la cola
    this.stats = {
      totalEnqueued: 0,
      totalCompleted: 0,
      totalFailed: 0
    };

    // Listeners para eventos de la cola
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Cuando la cola se vacía
    this.queue.on('idle', () => {
      console.log('✓ Queue is idle - all jobs processed');
    });

    // Cuando se agrega un job
    this.queue.on('add', () => {
      console.log(`→ Job added to queue. Pending: ${this.queue.pending}, Active: ${this.queue.size}`);
    });

    // Cuando un job comienza
    this.queue.on('active', () => {
      console.log(`▶ Job started. Running: ${this.queue.pending}, Waiting: ${this.queue.size}`);
    });
  }

  /**
   * Encola una función para ser ejecutada
   * @param {Function} fn - Función a ejecutar (debe retornar una Promise)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise} - Promise que se resuelve cuando la función termina
   */
  async add(fn, options = {}) {
    this.stats.totalEnqueued++;

    try {
      const result = await this.queue.add(fn, {
        priority: options.priority || 0
      });

      this.stats.totalCompleted++;
      return result;
    } catch (error) {
      this.stats.totalFailed++;
      throw error;
    }
  }

  /**
   * Obtiene información del estado de la cola
   * @returns {Object} - Información de la cola
   */
  getInfo() {
    return {
      // Jobs actualmente ejecutándose
      activeJobs: this.queue.pending,

      // Jobs esperando en cola
      queuedJobs: this.queue.size,

      // Total en el sistema (activos + en cola)
      totalJobs: this.queue.pending + this.queue.size,

      // Configuración
      maxConcurrency: this.queue.concurrency,

      // Estadísticas históricas
      stats: {
        ...this.stats
      },

      // Estado de la cola
      isPaused: this.queue.isPaused,
      isIdle: this.queue.size === 0 && this.queue.pending === 0
    };
  }

  /**
   * Calcula la posición aproximada en la cola
   * @returns {number} - Posición en cola (0 si está ejecutándose)
   */
  getApproximatePosition() {
    // Si hay jobs activos, el siguiente está en posición 1
    // Si no hay jobs activos, está en posición 0
    return this.queue.size;
  }

  /**
   * Pausa la cola (no afecta jobs en ejecución)
   */
  pause() {
    this.queue.pause();
    console.log('⏸ Queue paused');
  }

  /**
   * Reanuda la cola
   */
  resume() {
    this.queue.start();
    console.log('▶ Queue resumed');
  }

  /**
   * Limpia todos los jobs pendientes (no afecta jobs en ejecución)
   */
  clear() {
    this.queue.clear();
    console.log('🗑 Queue cleared');
  }
}

// Singleton - una sola instancia para toda la aplicación
const queueManager = new QueueManager();

module.exports = queueManager;
