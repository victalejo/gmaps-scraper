const { SELECTORS, INFO_KEYWORDS, EXPAND_PATTERNS } = require('./selectors');

/**
 * Navega a la sección de reseñas y selecciona "Más recientes"
 */
async function navigateToReviews(page, url) {
  console.log('  → Navegando a la URL del negocio...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Esperar a que cargue el contenido
  await page.waitForTimeout(3000);

  try {
    // Buscar el botón de reseñas (puede tener diferentes textos)
    const reviewsButton = page.locator('button').filter({ hasText: /reseñas|reviews|opiniones/i }).first();

    if (await reviewsButton.count() > 0) {
      console.log('  → Haciendo clic en la pestaña de Reseñas...');
      await reviewsButton.click();
      await page.waitForTimeout(2000);
    }

    // Buscar y hacer clic en el botón de ordenamiento
    console.log('  → Seleccionando "Más recientes"...');

    // Intentar encontrar el botón de ordenar
    const sortButtons = await page.locator('button').all();
    let sortButton = null;

    for (const button of sortButtons) {
      const text = await button.textContent().catch(() => '');
      if (text.includes('Ordenar') || text.includes('Sort') || text.includes('Más relevantes') || text.includes('Most relevant')) {
        sortButton = button;
        break;
      }
    }

    if (sortButton) {
      await sortButton.click();
      await page.waitForTimeout(1000);

      // Seleccionar "Más recientes" (segunda opción)
      const menuItems = page.locator('div[role="menuitemradio"]');
      if (await menuItems.count() >= 2) {
        await menuItems.nth(1).click();
        await page.waitForTimeout(2000);
        console.log('  ✓ Seleccionadas reseñas más recientes');
      }
    } else {
      console.log('  ⚠ No se encontró el botón de ordenamiento, continuando...');
    }

  } catch (error) {
    console.log('  ⚠ Error en navegación (continuando):', error.message);
  }
}

/**
 * Hace scroll para cargar más reseñas
 */
async function scrollToLoadReviews(page, targetCount) {
  console.log(`  → Cargando hasta ${targetCount} reseñas...`);

  let currentCount = 0;
  let scrollAttempts = 0;
  const maxScrolls = 300; // Aumentado significativamente
  let stuckCount = 0;
  const maxStuckCount = 20; // MUCHO más paciente (antes era 8)
  let lastExpandedAt = 0; // Track última expansión
  const expandInterval = 200; // Expandir cada 200 reseñas (muy espaciado para no romper scroll)

  // Ajustar tiempo de espera basado en cantidad solicitada
  const baseDelay = targetCount > 500 ? 3000 : targetCount > 100 ? 2500 : 2000;

  while (scrollAttempts < maxScrolls) {
    // Contar reseñas actuales
    const previousCount = currentCount;
    currentCount = await page.locator(SELECTORS.reviewCard).count();

    // Logging cada 10 scrolls o cuando cambia
    if (scrollAttempts % 10 === 0 || currentCount !== previousCount) {
      console.log(`    Reseñas cargadas: ${currentCount}/${targetCount}`);
    }

    // EXPANSIÓN INMEDIATA: Expandir botones "Más" visibles después de cada scroll
    // Esto evita acumular cientos de botones al final
    try {
      const visibleButtons = await page.locator('button').filter({
        hasText: /Más$|More$|\.\.\.más|\.\.\.more/i
      }).all();

      // Expandir hasta 2 botones visibles por ciclo de scroll
      for (let i = 0; i < Math.min(visibleButtons.length, 2); i++) {
        try {
          const button = visibleButtons[i];
          const isVisible = await button.isVisible({ timeout: 100 }).catch(() => false);
          if (isVisible) {
            await button.click({ timeout: 500, force: true }).catch(() => {});
            await page.waitForTimeout(100);
          }
        } catch {
          // Ignorar errores individuales
        }
      }
    } catch {
      // Ignorar errores de expansión
    }

    // Si ya tenemos suficientes, detener
    if (currentCount >= targetCount) {
      console.log(`  ✓ Se han cargado ${currentCount} reseñas`);
      break;
    }

    // Si no ha cambiado el contador, incrementar stuck
    if (currentCount === previousCount) {
      stuckCount++;
      if (stuckCount >= maxStuckCount) {
        console.log(`  ⚠ No se pueden cargar más reseñas después de ${stuckCount} intentos. Total: ${currentCount}`);
        break;
      }
      // Esperar MUCHO más tiempo cuando estamos "stuck" (progresivo hasta 8 segundos)
      const stuckDelay = baseDelay + (stuckCount * 1500);
      console.log(`    [Intento ${stuckCount}/${maxStuckCount}] Esperando ${stuckDelay}ms...`);
      await page.waitForTimeout(stuckDelay);
    } else {
      stuckCount = 0;
    }

    // Hacer scroll usando MÚLTIPLES métodos agresivos
    try {
      // Método 1: Scroll gradual en el contenedor (no solo al final de golpe)
      await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (container) {
          // Scroll gradual (3 pasos) para asegurar que se active el lazy loading
          const step = container.scrollHeight / 3;
          container.scrollTop += step;
          setTimeout(() => container.scrollTop += step, 200);
          setTimeout(() => container.scrollTop = container.scrollHeight, 400);
        }
      }, SELECTORS.scrollContainer);

      await page.waitForTimeout(baseDelay);

      // Método 2: Presionar End
      if (scrollAttempts % 2 === 0) {
        await page.keyboard.press('End');
        await page.waitForTimeout(800);
      }

      // Método 3: PageDown adicional (cada 3 scrolls)
      if (scrollAttempts % 3 === 0) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(500);
      }

      // Método 4: Cuando está muy stuck, hacer scroll más agresivo
      if (stuckCount > 5) {
        // Focus en la última reseña y hacer scroll
        try {
          const lastReview = page.locator(SELECTORS.reviewCard).last();
          await lastReview.scrollIntoViewIfNeeded({ timeout: 2000 });
          await page.waitForTimeout(1000);
        } catch (e) {
          // Ignorar si falla
        }

        // Múltiples scrolls rápidos
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('End');
          await page.waitForTimeout(500);
        }
      }

    } catch (error) {
      console.log('  ⚠ Error en scroll:', error.message);
    }

    scrollAttempts++;
  }

  return currentCount;
}

/**
 * Expande SOLO las reseñas visibles actualmente (para expansión progresiva)
 */
async function expandVisibleReviews(page) {
  try {
    // Buscar botones "Más..." visibles en viewport
    const expandButtons = await page.locator('button').filter({
      hasText: /Más$|More$|\.\.\.más|\.\.\.more/i
    }).all();

    let expandedCount = 0;

    // Expandir solo 3 botones por vez (MUY ligero para no romper scroll)
    for (let i = 0; i < Math.min(expandButtons.length, 3); i++) {
      const button = expandButtons[i];

      try {
        // Verificar si está visible
        const isVisible = await button.isVisible({ timeout: 100 }).catch(() => false);
        if (!isVisible) continue;

        // Scroll para asegurar visibilidad
        await button.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => {});
        await page.waitForTimeout(30);

        // Intentar clic
        try {
          await button.click({ timeout: 500 });
          expandedCount++;
          await page.waitForTimeout(50);
        } catch {
          // Si falla el clic normal, forzar
          try {
            await button.click({ force: true, timeout: 500 });
            expandedCount++;
          } catch {
            // Ignorar si falla
          }
        }
      } catch {
        // Ignorar errores individuales
        continue;
      }
    }

    if (expandedCount > 0) {
      console.log(`      ✓ Expandidas ${expandedCount} reseñas`);
    }
  } catch (error) {
    // Ignorar errores en expansión progresiva
  }
}

/**
 * Expande todas las reseñas truncadas (botones "Más...")
 * Usa múltiples pasadas para asegurar que todo se expande
 */
async function expandAllReviews(page) {
  console.log('  → Expandiendo reseñas truncadas...');

  let totalExpanded = 0;
  const maxPasses = 50; // Aumentado para manejar datasets grandes (396 botones / 30 = 13 pasadas)
  const buttonsPerPass = 30; // Máximo de botones por pasada (evita sobrecarga)

  for (let pass = 1; pass <= maxPasses; pass++) {
    try {
      // Buscar todos los botones que contienen "Más", "More", etc.
      const expandButtons = await page.locator('button').filter({
        hasText: /Más$|More$|\.\.\.más|\.\.\.more/i
      }).all();

      if (expandButtons.length === 0) {
        if (pass === 1) {
          console.log(`  ℹ No se encontraron reseñas truncadas`);
        } else {
          console.log(`  ✓ Expansión completa. Total expandidas: ${totalExpanded}`);
        }
        break;
      }

      console.log(`  → Pasada ${pass}: encontrados ${expandButtons.length} botones "Más..." (procesando máx ${buttonsPerPass})`);

      let expandedInPass = 0;
      const batchSize = 10; // Procesar en batches más pequeños

      // LIMITAR a buttonsPerPass botones por pasada
      const buttonsToProcess = Math.min(expandButtons.length, buttonsPerPass);

      for (let i = 0; i < buttonsToProcess; i++) {
        try {
          const button = expandButtons[i];

          // Estrategia más agresiva: scroll múltiple
          await button.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(50);

          // Intentar hacer visible forzadamente
          await button.evaluate(el => {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
          }).catch(() => {});
          await page.waitForTimeout(50);

          // Intentar clic con force si es necesario
          let clicked = false;
          try {
            await button.click({ timeout: 1000 });
            clicked = true;
          } catch {
            // Si falla, intentar con force: true
            try {
              await button.click({ force: true, timeout: 1000 });
              clicked = true;
            } catch {
              // Si aún falla, intentar clic con JavaScript
              try {
                await button.evaluate(el => el.click());
                clicked = true;
              } catch {}
            }
          }

          if (clicked) {
            expandedInPass++;
            // Esperar más tiempo para reseñas largas (reorganización del DOM)
            await page.waitForTimeout(200);
          }

          // Esperar después de cada batch
          if ((i + 1) % batchSize === 0) {
            await page.waitForTimeout(500);
          }

        } catch (error) {
          // Ignorar errores individuales, continuar con el siguiente
          continue;
        }
      }

      console.log(`  ✓ Expandidas ${expandedInPass} en pasada ${pass}`);
      totalExpanded += expandedInPass;

      // Esperar entre pasadas para que se renderice todo
      await page.waitForTimeout(1000);

    } catch (error) {
      console.log(`  ⚠ Error en pasada ${pass}:`, error.message);
    }
  }

  console.log(`  ✓ Total expandidas: ${totalExpanded} reseñas`);
}

/**
 * Extrae las fotos de una reseña
 */
async function extractReviewPhotos(reviewCard) {
  try {
    const photoUrls = [];

    // Las fotos están en botones con clase 'Tya61d' como background-image
    const photoButtons = await reviewCard.locator('button.Tya61d').all();

    for (const button of photoButtons) {
      // Obtener el atributo style que contiene background-image
      const style = await button.getAttribute('style').catch(() => null);

      if (style && style.includes('background-image')) {
        // Extraer URL del background-image: url("...") o url(&quot;...&quot;)
        // Primero intentar con comillas reales
        let match = style.match(/background-image:\s*url\(["']([^"']+)["']\)/);

        // Si no funciona, intentar con entidades HTML
        if (!match) {
          match = style.match(/background-image:\s*url\(&quot;([^&]+)&quot;\)/);
        }

        if (match && match[1]) {
          let url = match[1];

          // Limpiar parámetros de tamaño para obtener imagen original
          // La URL termina con algo como "=w600-h450-p", quitamos eso
          url = url.split('=w')[0];

          if (!photoUrls.includes(url)) {
            photoUrls.push(url);
          }
        }
      }
    }

    return photoUrls;
  } catch (error) {
    return [];
  }
}

/**
 * Extrae la respuesta del propietario
 */
async function extractOwnerResponse(reviewCard) {
  try {
    const responseContainer = reviewCard.locator('.CDe7pd').first();

    if (await responseContainer.count() === 0) {
      return null;
    }

    const responseText = await responseContainer.locator('.wiI7pd').textContent().catch(() => null);
    const responseDate = await responseContainer.locator('.rsqaWe').textContent().catch(() => null);

    if (responseText) {
      return {
        text: responseText.trim(),
        date: responseDate ? responseDate.trim() : null,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extrae información adicional (precio, calificaciones específicas, etc.)
 * Busca bloques .PBK6be Y bloques especiales de "Precio por persona"
 */
async function extractAdditionalInfo(reviewCard) {
  try {
    const info = {};
    const processedKeys = new Set(); // Para evitar duplicados por clave

    // PASO 1: Extraer de bloques .PBK6be (formato estándar)
    const pbk6beBlocks = await reviewCard.locator('.PBK6be').all();

    for (const block of pbk6beBlocks) {
      try {
        await processInfoBlock(block, info, processedKeys);
      } catch (blockError) {
        continue;
      }
    }

    // PASO 2: Buscar específicamente "Precio por persona" usando el span .RfDO5c
    // Este campo NO está en un .PBK6be, está en una estructura diferente
    try {
      const priceSpans = await reviewCard.locator('span.RfDO5c').filter({
        hasText: /precio|price/i
      }).all();

      for (const priceSpan of priceSpans) {
        try {
          // El span de título está en un div padre
          const titleDiv = priceSpan.locator('..');
          const parentDiv = titleDiv.locator('..'); // Abuelo que contiene título y valor

          // Buscar los 2 divs hijos del abuelo
          const childDivs = await parentDiv.locator('> div').all();

          if (childDivs.length === 2) {
            const titleText = await childDivs[0].textContent({ timeout: 500 }).catch(() => '');
            const valueText = await childDivs[1].textContent({ timeout: 500 }).catch(() => '');

            const title = titleText.trim().replace(/[:：]/g, '').trim();
            const value = valueText.trim();

            if (title && value && !processedKeys.has(title)) {
              info[title] = value;
              processedKeys.add(title);
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      // Ignorar error si no hay precio
    }

    // PASO 3: Buscar TODOS los spans .RfDO5c que contengan "Label: Value"
    // Algunos campos (como "Comida: 2" en Sandra) NO están en .PBK6be
    try {
      const allSpans = await reviewCard.locator('span.RfDO5c').all();

      for (const span of allSpans) {
        try {
          const text = await span.textContent({ timeout: 500 }).catch(() => '');

          // Buscar patrón "Label: Value" donde Value es un número
          const match = text.match(/^([^:]+):\s*(\d+)$/);

          if (match) {
            const label = match[1].trim();
            const value = parseInt(match[2]);

            if (!processedKeys.has(label)) {
              info[label] = value;
              processedKeys.add(label);
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      // Ignorar error
    }

    return Object.keys(info).length > 0 ? info : null;
  } catch (error) {
    return null;
  }
}

/**
 * Procesa un bloque de información (.PBK6be)
 * Modifica el objeto info directamente
 */
async function processInfoBlock(block, info, processedKeys) {
  // Buscar divs hijos directos del bloque (estructura real del DOM)
  const childDivs = await block.locator('> div').all();

  if (childDivs.length >= 2) {
    // Caso A: Estructura de dos divs hermanos (título y valor separados)
    // Ejemplo: <div>Servicio</div><div>Comí allí</div>
    const titleText = await childDivs[0].textContent({ timeout: 500 }).catch(() => '');
    const valueText = await childDivs[1].textContent({ timeout: 500 }).catch(() => '');

    const title = titleText.trim().replace(/[:：]/g, '').trim();
    const value = valueText.trim();

    if (title && value && !processedKeys.has(title)) {
      // Convertir a número si es un rating
      const numMatch = value.match(/^(\d+)$/);
      const isNumeric = numMatch !== null;

      // Si la clave ya existe y el nuevo valor es numérico, agregar sufijo "Rating"
      let finalKey = title;
      if (info.hasOwnProperty(title) && isNumeric) {
        finalKey = title + 'Rating';
      }

      if (isNumeric) {
        info[finalKey] = parseInt(numMatch[1]);
      } else {
        info[finalKey] = value;
      }

      processedKeys.add(finalKey);
    }
  } else {
    // Caso B: Estructura con spans dentro del bloque
    const spans = await block.locator('.RfDO5c').all();

    if (spans.length >= 2) {
      const titleText = await spans[0].textContent({ timeout: 500 }).catch(() => '');
      const valueText = await spans[1].textContent({ timeout: 500 }).catch(() => '');

      const title = titleText.trim().replace(/[:：]/g, '').trim();
      const value = valueText.trim();

      if (title && value && !processedKeys.has(title)) {
        const numMatch = value.match(/^(\d+)$/);
        const isNumeric = numMatch !== null;

        let finalKey = title;
        if (info.hasOwnProperty(title) && isNumeric) {
          finalKey = title + 'Rating';
        }

        if (isNumeric) {
          info[finalKey] = parseInt(numMatch[1]);
        } else {
          info[finalKey] = value;
        }

        processedKeys.add(finalKey);
      }
    } else if (spans.length === 1) {
      // Caso C: Un span con formato "Título: valor"
      const spanText = await spans[0].textContent({ timeout: 500 }).catch(() => '');
      const match = spanText.match(/^([^:：]+)[:：]\s*(.+)$/);

      if (match) {
        const title = match[1].trim();
        const value = match[2].trim();

        if (title && value && !processedKeys.has(title)) {
          const numMatch = value.match(/^(\d+)$/);
          const isNumeric = numMatch !== null;

          let finalKey = title;
          if (info.hasOwnProperty(title) && isNumeric) {
            finalKey = title + 'Rating';
          }

          if (isNumeric) {
            info[finalKey] = parseInt(numMatch[1]);
          } else {
            info[finalKey] = value;
          }

          processedKeys.add(finalKey);
        }
      }
    }
  }
}

/**
 * Extrae información del reviewer (Local Guide, número de reseñas, fotos)
 */
async function extractReviewerInfo(reviewCard) {
  try {
    // Buscar el elemento con clase .RfnDt que contiene la info del reviewer
    const reviewerInfoText = await reviewCard.locator('.RfnDt')
      .textContent({ timeout: 1000 })
      .catch(() => null);

    if (!reviewerInfoText) {
      return {
        isLocalGuide: false,
        reviewCount: null,
        photoCount: null
      };
    }

    const info = {
      isLocalGuide: reviewerInfoText.includes('Local Guide'),
      reviewCount: null,
      photoCount: null
    };

    // Extraer número de reseñas/opiniones
    // Formatos: "92 reseñas", "1 reseña", "92 opiniones", "1 opinión", "92 reviews", "1 review"
    const reviewMatch = reviewerInfoText.match(/(\d+)\s*(?:reseñas?|opiniones?|reviews?)/i);
    if (reviewMatch) {
      info.reviewCount = parseInt(reviewMatch[1]);
    }

    // Extraer número de fotos
    // Formatos: "3 fotos", "3 photos"
    const photoMatch = reviewerInfoText.match(/(\d+)\s*(?:fotos?|photos?)/i);
    if (photoMatch) {
      info.photoCount = parseInt(photoMatch[1]);
    }

    return info;
  } catch (error) {
    return {
      isLocalGuide: false,
      reviewCount: null,
      photoCount: null
    };
  }
}

/**
 * Extrae los datos de una reseña individual
 */
async function extractReviewData(reviewCard, index) {
  try {
    // Extraer todo el texto de la tarjeta de una vez con timeout
    const allText = await Promise.race([
      reviewCard.textContent(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]).catch(() => '');

    // Nombre del reviewer
    const reviewerName = await reviewCard.locator(SELECTORS.reviewerName)
      .textContent({ timeout: 1000 })
      .catch(() => null);

    // Calificación (extraer del aria-label)
    let rating = null;
    try {
      const ariaLabel = await reviewCard.locator(SELECTORS.starRating)
        .getAttribute('aria-label', { timeout: 1000 });
      const match = ariaLabel.match(/(\d+)/);
      if (match) {
        rating = parseInt(match[1]);
      }
    } catch (error) {
      // Ignorar si no se encuentra
    }

    // Texto de la reseña - buscar específicamente dentro del contenedor MyEned
    // para evitar capturar la respuesta del propietario cuando no hay texto
    const reviewText = await reviewCard.locator('.MyEned .wiI7pd')
      .textContent({ timeout: 1000 })
      .catch(() => null);

    // Fecha
    const reviewDate = await reviewCard.locator(SELECTORS.reviewDate)
      .textContent({ timeout: 1000 })
      .catch(() => null);

    // Foto de perfil
    const profilePhotoUrl = await reviewCard.locator(SELECTORS.profilePhoto)
      .getAttribute('src', { timeout: 1000 })
      .catch(() => null);

    // ID de la reseña
    const reviewId = `review_${index}_${Date.now()}`;

    // Fotos de la reseña
    const photos = await extractReviewPhotos(reviewCard);

    // Respuesta del propietario (simplificado)
    const ownerResponseText = await reviewCard.locator('.CDe7pd .wiI7pd')
      .textContent({ timeout: 1000 })
      .catch(() => null);
    const ownerResponse = ownerResponseText ? { text: ownerResponseText.trim() } : null;

    // Información del reviewer (Local Guide, número de reseñas, fotos)
    const reviewerInfo = await extractReviewerInfo(reviewCard);

    // Información adicional (usa la función mejorada)
    const additionalInfo = await extractAdditionalInfo(reviewCard);

    return {
      reviewId,
      reviewerName: reviewerName ? reviewerName.trim() : null,
      isLocalGuide: reviewerInfo.isLocalGuide,
      reviewCount: reviewerInfo.reviewCount,
      photoCount: reviewerInfo.photoCount,
      rating,
      reviewText: reviewText ? reviewText.trim() : null,
      reviewDate: reviewDate ? reviewDate.trim() : null,
      profilePhotoUrl,
      photos,
      ownerResponse,
      additionalInfo,
    };

  } catch (error) {
    console.error(`  ✗ Error extrayendo reseña #${index}:`, error.message);
    return null;
  }
}

/**
 * Extrae todas las reseñas de la página
 */
async function extractAllReviews(page, maxReviews) {
  console.log(`  → Extrayendo datos de reseñas...`);

  const reviewCards = await page.locator(SELECTORS.reviewCard).all();
  const limit = Math.min(reviewCards.length, maxReviews);
  const reviews = [];

  for (let i = 0; i < limit; i++) {
    const reviewData = await extractReviewData(reviewCards[i], i);

    if (reviewData) {
      reviews.push(reviewData);

      // Log progreso cada 10 reseñas
      if ((i + 1) % 10 === 0) {
        console.log(`    Procesadas ${i + 1}/${limit} reseñas`);
      }
    }
  }

  console.log(`  ✓ Extraídas ${reviews.length} reseñas`);
  return reviews;
}

/**
 * Guarda los datos en formato JSON
 */
async function saveToJSON(data, filepath) {
  const fs = require('fs').promises;

  const output = {
    scrapedAt: new Date().toISOString(),
    totalReviews: data.length,
    reviews: data,
  };

  await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✓ Datos guardados en: ${filepath}`);
}

module.exports = {
  navigateToReviews,
  scrollToLoadReviews,
  expandAllReviews,
  extractAllReviews,
  saveToJSON,
};
