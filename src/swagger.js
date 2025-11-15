const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Google Maps Scraper API',
      version: '1.0.0',
      description: 'API REST para scraping de reseñas de Google Maps usando Playwright. Permite iniciar jobs de scraping asíncronos y consultar su estado y resultados.',
      contact: {
        name: 'API Support',
        url: 'https://github.com/yourusername/gmaps-scraper',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    tags: [
      {
        name: 'Scraping',
        description: 'Operaciones de scraping de reseñas',
      },
      {
        name: 'Jobs',
        description: 'Gestión y consulta de jobs',
      },
      {
        name: 'Sistema',
        description: 'Información del sistema',
      },
    ],
    components: {
      schemas: {
        ScrapeRequest: {
          type: 'object',
          required: ['businessUrl'],
          properties: {
            businessUrl: {
              type: 'string',
              description: 'URL completa del negocio en Google Maps',
              example: 'https://www.google.com/maps/place/Bellas+Artes/@19.4352,-99.1412,17z',
            },
            maxReviews: {
              type: 'number',
              description: 'Número máximo de reseñas a extraer (default: 50, max: 1000)',
              default: 50,
              minimum: 1,
              maximum: 1000,
              example: 100,
            },
          },
        },
        ScrapeResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Scraping job iniciado',
            },
            jobId: {
              type: 'string',
              example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            },
            status: {
              type: 'string',
              example: 'pending',
            },
            statusUrl: {
              type: 'string',
              example: '/api/status/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            },
            resultsUrl: {
              type: 'string',
              example: '/api/results/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            },
          },
        },
        JobStatus: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'error'],
              example: 'running',
            },
            businessUrl: {
              type: 'string',
              example: 'https://www.google.com/maps/place/...',
            },
            maxReviews: {
              type: 'number',
              example: 100,
            },
            progress: {
              type: 'number',
              description: 'Porcentaje de progreso (0-100)',
              example: 45,
            },
            currentStep: {
              type: 'string',
              example: 'Cargando reseñas mediante scroll',
            },
            reviewsExtracted: {
              type: 'number',
              example: 32,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-14T10:30:00.000Z',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-11-14T10:30:01.000Z',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
            error: {
              type: 'object',
              nullable: true,
              properties: {
                message: {
                  type: 'string',
                },
                stack: {
                  type: 'string',
                },
              },
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            reviewId: {
              type: 'string',
              example: 'ChdDSUhNMG9nS0VJQ0FnSUR...',
            },
            reviewerName: {
              type: 'string',
              example: 'Juan Pérez',
            },
            isLocalGuide: {
              type: 'boolean',
              example: true,
            },
            reviewCount: {
              type: 'number',
              example: 150,
            },
            photoCount: {
              type: 'number',
              example: 45,
            },
            rating: {
              type: 'number',
              description: 'Calificación en estrellas (1-5)',
              minimum: 1,
              maximum: 5,
              example: 5,
            },
            reviewText: {
              type: 'string',
              example: 'Excelente lugar, muy buena comida y ambiente agradable...',
            },
            reviewDate: {
              type: 'string',
              example: 'hace 2 semanas',
            },
            profilePhotoUrl: {
              type: 'string',
              example: 'https://lh3.googleusercontent.com/...',
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['https://lh5.googleusercontent.com/...', 'https://lh5.googleusercontent.com/...'],
            },
            ownerResponse: {
              type: 'object',
              nullable: true,
              properties: {
                text: {
                  type: 'string',
                },
                date: {
                  type: 'string',
                },
              },
              example: {
                text: '¡Gracias por tu visita! Esperamos verte pronto',
                date: 'hace 1 semana',
              },
            },
            additionalInfo: {
              type: 'object',
              nullable: true,
              properties: {
                pricePerPerson: {
                  type: 'string',
                },
                foodRating: {
                  type: 'string',
                },
                serviceRating: {
                  type: 'string',
                },
                atmosphereRating: {
                  type: 'string',
                },
              },
              example: {
                pricePerPerson: '$100-200',
                foodRating: '5',
                serviceRating: '5',
                atmosphereRating: '4',
              },
            },
          },
        },
        JobResults: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            },
            status: {
              type: 'string',
              example: 'completed',
            },
            businessUrl: {
              type: 'string',
              example: 'https://www.google.com/maps/place/...',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-14T10:35:00.000Z',
            },
            results: {
              type: 'object',
              properties: {
                scrapedAt: {
                  type: 'string',
                  format: 'date-time',
                },
                totalReviews: {
                  type: 'number',
                },
                reviews: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Review',
                  },
                },
                summary: {
                  type: 'object',
                  properties: {
                    withPhotos: {
                      type: 'number',
                    },
                    withOwnerResponse: {
                      type: 'number',
                    },
                    withAdditionalInfo: {
                      type: 'number',
                    },
                  },
                },
              },
            },
          },
        },
        Stats: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total de jobs en el sistema',
              example: 10,
            },
            pending: {
              type: 'number',
              description: 'Jobs en cola',
              example: 2,
            },
            running: {
              type: 'number',
              description: 'Jobs en ejecución',
              example: 1,
            },
            completed: {
              type: 'number',
              description: 'Jobs completados',
              example: 6,
            },
            error: {
              type: 'number',
              description: 'Jobs fallidos',
              example: 1,
            },
            maxJobs: {
              type: 'number',
              description: 'Capacidad máxima de jobs',
              example: 1000,
            },
          },
        },
        ErrorJobsResponse: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Número de jobs con error',
              example: 2,
            },
            jobs: {
              type: 'array',
              description: 'Lista de jobs con error',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
                  },
                  businessUrl: {
                    type: 'string',
                    example: 'https://www.google.com/maps/place/...',
                  },
                  maxReviews: {
                    type: 'number',
                    example: 100,
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-11-14T10:30:00.000Z',
                  },
                  startedAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2025-11-14T10:30:01.000Z',
                  },
                  completedAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2025-11-14T10:32:15.000Z',
                  },
                  progress: {
                    type: 'number',
                    description: 'Porcentaje de progreso donde falló (0-100)',
                    example: 45,
                  },
                  currentStep: {
                    type: 'string',
                    description: 'Último paso ejecutado antes del error',
                    example: 'Cargando reseñas mediante scroll',
                  },
                  reviewsExtracted: {
                    type: 'number',
                    description: 'Número de reseñas extraídas antes del error',
                    example: 32,
                  },
                  error: {
                    type: 'object',
                    description: 'Detalles del error',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'TimeoutError: Waiting for selector failed: timeout 30000ms exceeded',
                      },
                      stack: {
                        type: 'string',
                        example: 'Error: TimeoutError...\n    at ...',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Bad Request',
            },
            message: {
              type: 'string',
              example: 'Missing required field: businessUrl',
            },
          },
        },
      },
    },
  },
  apis: ['./src/api.js'], // Archivos donde están las anotaciones
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
