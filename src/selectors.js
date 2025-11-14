/**
 * Selectores CSS para Google Maps
 * NOTA: Google cambia frecuentemente estos selectores, puede ser necesario actualizarlos
 */

const SELECTORS = {
  // Contenedores principales
  scrollContainer: 'div[role="feed"]',
  scrollContainerAlt: 'div.m6QErb.DxyBCb.kA9KIf.dS8AEf',

  // Navegación y pestañas
  reviewsTab: 'button[role="tab"]',
  reviewsTabByIndex: '[data-tab-index="1"]',

  // Botones de ordenamiento
  sortButton: 'button[data-value="Sort"]',
  sortButtonAlt: 'button.g88MCb.S9kvJb',
  mostRecentOption: 'div[data-index="1"]',

  // Reseñas
  reviewCard: '.jftiEf.fontBodyMedium',
  reviewCardAlt: 'div.jftiEf',

  // Elementos de la reseña
  reviewerName: '.d4r55',
  reviewerNameAlt: 'div.d4r55',

  starRating: '.kvMYJc',
  starRatingAlt: 'span.kvMYJc',

  reviewText: '.wiI7pd',
  reviewTextAlt: 'span.wiI7pd',

  reviewDate: '.rsqaWe',
  reviewDateAlt: 'span.rsqaWe',

  // Botón de expansión "Más..."
  expandButton: 'button.w8nwRe.kyuRq',
  expandButtonAlt: 'button[jsaction*="review"]',

  // Perfil del usuario
  profilePhoto: 'img.NBa7we',
  profilePhotoAlt: 'button img',
  profileLink: 'button.WEBjve',

  // Fotos de la reseña
  reviewPhotos: 'button[jsaction*="photo"]',
  reviewPhotoImage: 'img',

  // Respuesta del local
  ownerResponseContainer: '.CDe7pd',
  ownerResponseText: '.wiI7pd',
  ownerResponseDate: '.rsqaWe',

  // Información adicional (restaurantes)
  additionalInfoContainer: 'div[class*="review"]',

  // Atributos de datos
  dataAttributes: {
    reviewId: 'data-review-id',
    dataIndex: 'data-index',
    ariaLabel: 'aria-label',
  },
};

/**
 * Textos a buscar para información adicional (multiidioma)
 */
const INFO_KEYWORDS = {
  pricePerPerson: {
    es: ['Precio por persona', 'Price per person'],
    en: ['Price per person'],
  },
  food: {
    es: ['Comida:', 'Food:'],
    en: ['Food:'],
  },
  service: {
    es: ['Servicio:', 'Service:'],
    en: ['Service:'],
  },
  atmosphere: {
    es: ['Ambiente:', 'Atmosphere:'],
    en: ['Atmosphere:'],
  },
  reservations: {
    es: ['Reservas', 'Reservations'],
    en: ['Reservations'],
  },
  noiseLevel: {
    es: ['Nivel de ruido', 'Noise level'],
    en: ['Noise level'],
  },
  waitTime: {
    es: ['Tiempo de espera', 'Wait time'],
    en: ['Wait time'],
  },
};

/**
 * Patrones para expandir reseñas
 */
const EXPAND_PATTERNS = {
  buttonText: ['Más', 'More', '...más', '...more'],
};

module.exports = {
  SELECTORS,
  INFO_KEYWORDS,
  EXPAND_PATTERNS,
};
