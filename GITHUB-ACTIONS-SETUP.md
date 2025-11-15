# Configuración de GitHub Actions para Despliegue Automático

Este documento explica cómo configurar el despliegue automático a Dokku usando GitHub Actions.

## Requisitos Previos

- Cuenta de GitHub
- Acceso a la clave SSH de Aurora (`~/.ssh/aurora`)
- Repositorio de GitHub (crear uno nuevo o usar existente)

## Paso 1: Crear Repositorio en GitHub

### Opción A: Crear nuevo repositorio
1. Ve a https://github.com/new
2. Nombre sugerido: `gmaps-scraper` o `gmaps-scraper-api`
3. **NO** inicialices con README, .gitignore o licencia (ya los tienes localmente)
4. Crea el repositorio
5. Copia la URL del repositorio (ejemplo: `https://github.com/tu-usuario/gmaps-scraper.git`)

### Opción B: Usar repositorio existente
Si ya tienes un repositorio, solo necesitas la URL.

---

## Paso 2: Configurar Remote de GitHub

Ejecuta estos comandos en tu terminal local:

```bash
# Agregar remote de GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU-USUARIO/gmaps-scraper.git

# Verificar remotes
git remote -v
```

Deberías ver algo así:
```
dokku   dokku@31.220.102.71:apigmaps (fetch)
dokku   dokku@31.220.102.71:apigmaps (push)
origin  https://github.com/TU-USUARIO/gmaps-scraper.git (fetch)
origin  https://github.com/TU-USUARIO/gmaps-scraper.git (push)
```

---

## Paso 3: Configurar Secretos en GitHub

Los secretos son variables de entorno privadas que GitHub Actions usará para el despliegue.

### 3.1: Obtener la clave SSH de Aurora

En tu terminal local (Git Bash en Windows), ejecuta:

```bash
cat ~/.ssh/aurora
```

Copia **TODO** el contenido, incluyendo las líneas:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 3.2: Configurar los secretos

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral izquierdo, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

Agrega estos **3 secretos**:

#### Secreto 1: DOKKU_SSH_PRIVATE_KEY
- **Name:** `DOKKU_SSH_PRIVATE_KEY`
- **Value:** Pega el contenido completo de `~/.ssh/aurora` que copiaste antes
- Click **Add secret**

#### Secreto 2: DOKKU_HOST
- **Name:** `DOKKU_HOST`
- **Value:** `31.220.102.71`
- Click **Add secret**

#### Secreto 3: DOKKU_APP_NAME
- **Name:** `DOKKU_APP_NAME`
- **Value:** `apigmaps`
- Click **Add secret**

### 3.3: Verificar secretos configurados

Deberías ver 3 secretos listados:
- ✓ DOKKU_SSH_PRIVATE_KEY
- ✓ DOKKU_HOST
- ✓ DOKKU_APP_NAME

---

## Paso 4: Push Inicial a GitHub

Ejecuta estos comandos en tu terminal local:

```bash
# Agregar archivos del workflow al commit
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow for automatic deployment"

# Push a GitHub (primera vez)
git push -u origin master
```

**Nota:** Si tu rama se llama `main` en lugar de `master`, usa:
```bash
git push -u origin main
```

---

## Paso 5: Verificar el Workflow

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Deberías ver un workflow corriendo: "Deploy to Dokku"
4. Click en el workflow para ver el progreso en tiempo real

### Estados del workflow:
- 🟡 **Amarillo (corriendo):** El despliegue está en progreso
- ✅ **Verde (success):** El despliegue fue exitoso
- ❌ **Rojo (failed):** Hubo un error (revisa los logs)

---

## Cómo Funciona

Una vez configurado, cada vez que hagas `git push` a la rama `master` o `main`:

1. GitHub Actions detecta el push
2. Ejecuta el workflow automáticamente
3. Conecta al servidor Dokku usando SSH
4. Despliega la nueva versión de tu aplicación
5. Verifica que la app esté corriendo

**No necesitas hacer `git push dokku master` manualmente nunca más.**

---

## Flujo de Trabajo Típico

```bash
# 1. Hacer cambios en tu código
# 2. Agregar y commitear
git add .
git commit -m "Mi cambio"

# 3. Push a GitHub (esto dispara el despliegue automático)
git push origin master

# 4. Ve a GitHub Actions para ver el progreso
# 5. ¡Listo! Tu app se despliega automáticamente
```

---

## Troubleshooting

### Error: "Permission denied (publickey)"
- Verifica que `DOKKU_SSH_PRIVATE_KEY` contenga la clave completa de Aurora
- Asegúrate de incluir las líneas `-----BEGIN` y `-----END`

### Error: "fatal: could not read from remote repository"
- Verifica que `DOKKU_HOST` sea `31.220.102.71`
- Verifica que `DOKKU_APP_NAME` sea `apigmaps`

### Workflow no se ejecuta
- Verifica que el push sea a la rama `master` o `main`
- Revisa que el archivo `.github/workflows/deploy.yml` exista en el repositorio

### Ver logs del deployment
1. Ve a **Actions** en GitHub
2. Click en el workflow que falló
3. Click en "Deploy to Production"
4. Expande cada paso para ver los logs detallados

---

## Mejoras Futuras (Opcional)

- **Tests automáticos:** Agregar tests antes del deploy
- **Notificaciones:** Enviar alertas a Slack/Discord cuando el deploy termine
- **Environments:** Configurar staging y production separados
- **Branch protection:** Requerir pull requests antes de merge a main

---

## Recursos

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dokku Documentation](https://dokku.com/docs/deployment/application-deployment/)
- Workflow file: `.github/workflows/deploy.yml`
