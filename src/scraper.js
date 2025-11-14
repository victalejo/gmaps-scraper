const { chromium } = require('playwright');
const path = require('path');
const {
  navigateToReviews,
  scrollToLoadReviews,
  expandAllReviews,
  extractAllReviews,
  saveToJSON,
} = require('./utils');

/**
 * Función principal del scraper de Google Maps
 * @param {string} businessUrl - URL de Google Maps del negocio
 * @param {number} maxReviews - Número máximo de reseñas a extraer
 * @param {Function} progressCallback - Callback opcional para reportar progreso (progress, step, reviewsCount)
 */
async function scrapeGoogleMapsReviews(businessUrl, maxReviews = 50, progressCallback = null) {
  console.log('\n=== Google Maps Reviews Scraper ===\n');
  console.log(`URL del negocio: ${businessUrl}`);
  console.log(`Reseñas solicitadas: ${maxReviews}\n`);

  let browser;

  try {
    // Iniciar navegador
    console.log('1. Iniciando navegador...');
    if (progressCallback) progressCallback(10, 'Iniciando navegador', 0);

    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'es-ES',
    });

    const page = await context.newPage();

    // Paso 1: Navegar a reseñas y seleccionar "Más recientes"
    console.log('\n2. Navegando a las reseñas...');
    if (progressCallback) progressCallback(20, 'Navegando a las reseñas', 0);
    await navigateToReviews(page, businessUrl);

    // Paso 2: Hacer scroll para cargar reseñas
    console.log('\n3. Cargando reseñas mediante scroll...');
    if (progressCallback) progressCallback(30, 'Cargando reseñas mediante scroll', 0);
    const loadedCount = await scrollToLoadReviews(page, maxReviews);

    if (loadedCount === 0) {
      throw new Error('No se encontraron reseñas en esta página');
    }

    // Esperar después del scroll para que todo el contenido se renderice
    console.log('  → Esperando a que se renderice el contenido...');
    if (progressCallback) progressCallback(60, 'Renderizando contenido', loadedCount);
    await page.waitForTimeout(3000);

    // Paso 3: Expandir reseñas truncadas (YA NO ES NECESARIO - se expande durante scroll)
    // La expansión ahora se hace de forma intercalada con el scroll
    // console.log('\n4. Expandiendo reseñas truncadas...');
    // await expandAllReviews(page);

    // Paso 4: Extraer datos
    console.log('\n4. Extrayendo datos de las reseñas...');
    if (progressCallback) progressCallback(70, 'Extrayendo datos de las reseñas', loadedCount);
    const reviews = await extractAllReviews(page, maxReviews);

    if (reviews.length === 0) {
      throw new Error('No se pudieron extraer datos de las reseñas');
    }

    // Paso 5: Guardar resultados (solo en modo CLI)
    if (!progressCallback) {
      console.log('\n6. Guardando resultados...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const outputPath = path.join(__dirname, '..', 'output', `reviews_${timestamp}.json`);
      await saveToJSON(reviews, outputPath);
    } else {
      if (progressCallback) progressCallback(90, 'Procesando resultados finales', reviews.length);
    }

    // Resumen
    console.log('\n=== Scraping Completado ===');
    console.log(`✓ Total de reseñas extraídas: ${reviews.length}`);
    console.log(`✓ Reseñas con fotos: ${reviews.filter(r => r.photos && r.photos.length > 0).length}`);
    console.log(`✓ Reseñas con respuesta del local: ${reviews.filter(r => r.ownerResponse).length}`);
    console.log(`✓ Reseñas con información adicional: ${reviews.filter(r => r.additionalInfo).length}`);

    return reviews;

  } catch (error) {
    console.error('\n✗ Error durante el scraping:', error.message);
    throw error;

  } finally {
    // Cerrar navegador
    if (browser) {
      await browser.close();
      console.log('\n✓ Navegador cerrado\n');
    }
  }
}

/**
 * Punto de entrada del script
 */
async function main() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\nUso: node scraper.js <URL_GOOGLE_MAPS> [NUM_RESEÑAS]');
    console.log('\nEjemplo:');
    console.log('  node scraper.js "https://www.google.com/maps/place/..." 50');
    console.log('\nArgumentos:');
    console.log('  URL_GOOGLE_MAPS  - URL completa del negocio en Google Maps (requerido)');
    console.log('  NUM_RESEÑAS      - Número de reseñas a extraer (opcional, default: 50)\n');
    process.exit(1);
  }

  const businessUrl = args[0];
  const maxReviews = args[1] ? parseInt(args[1]) : 50;

  // Validar URL
  if (!businessUrl.includes('google.com/maps')) {
    console.error('✗ Error: La URL debe ser de Google Maps');
    process.exit(1);
  }

  // Validar número de reseñas
  if (isNaN(maxReviews) || maxReviews < 1) {
    console.error('✗ Error: El número de reseñas debe ser un número positivo');
    process.exit(1);
  }

  try {
    await scrapeGoogleMapsReviews(businessUrl, maxReviews);
    process.exit(0);
  } catch (error) {
    console.error('✗ El scraping falló:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  scrapeGoogleMapsReviews,
};
