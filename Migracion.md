## Migracion del repo actual a repositorios separados

Objetivo: separar el repo actual en repositorios independientes sin romper el entorno local, sin perder historial Git y sin hacer un corte grande de una sola vez.

La regla principal de este proceso es simple:

1. No migrar todo al tiempo.
2. No mover codigo sin una linea base comprobada.
3. No dar por terminada una etapa sin pruebas y criterio Go/No-Go.
4. Mantener rollback claro en cada fase.

La arquitectura actual ya ayuda bastante:

- `mod-auth`, `mod-collab` y `mod-media` ya estan separados por carpeta.
- Hay esquemas separados en base de datos.
- El frontend ya consume al gateway.
- KrakenD ya desacopla al frontend de los nombres internos.
- No hay dependencias `workspace:*` entre modulos.

Pero el documento anterior omitia varias cosas importantes:

- No definia una etapa cero de inventario y linea base.
- No definia rollback por fase.
- No cubria el saneamiento de secretos y archivos sensibles.
- No cubria el impacto sobre scripts raiz como `start-project.ps1`.
- No cubria diferencias reales de configuracion entre modulos.
- No cubria como validar `crm-infra` sin depender del monorepo original.

Este plan corrige eso.

---

## Estado actual observado

Antes de migrar, estas son dependencias y riesgos reales del repo actual:

- El repo raiz orquesta el entorno local con `docker-compose.yml`, `docker-compose.prod.yml`, `start-project.ps1`, `start-project.cmd`, `krakend.json`, `gateway/` y `scripts/`.
- `gateway/build-krakend.mjs` depende del paquete `yaml` declarado en el `package.json` de la raiz. Por tanto `crm-infra` no puede quedarse sin ese `package.json` o sin una forma equivalente de instalar `yaml`.
- `mod-auth` tiene pruebas Hurl locales y via gateway.
- `mod-collab` tiene prueba Hurl smoke via gateway.
- `mod-media` no expone una suite de pruebas comparable; ahi hay que reforzar smoke tests.
- `crm-frontend` depende de `VITE_API_BASE_URL=/api` y del proxy de Vite hacia KrakenD en `http://localhost:8080`.
- `mod-collab` depende de `mod-auth` y `mod-media` por HTTP (`MOD_AUTH_URL`, `MOD_MEDIA_URL`).
- `mod-media` depende de `mod-collab` por HTTP (`MOD_COLLAB_URL`) para validaciones de acceso.
- `mod-auth`, `mod-collab`, `mod-media` y KrakenD comparten `GATEWAY_TRUST_SECRET`.
- Hay `pnpm-lock.yaml`, pero tambien hay `package-lock.json` en varios modulos. Eso es ruido y puede introducir instalaciones inconsistentes.
- En `mod-collab/README.md` todavia hay comandos con `npm`, lo cual contradice la regla del proyecto: siempre usar `pnpm`.
- `mod-collab/.env.example` usa una BD distinta a la que usan otros componentes (`crm_cima` vs `crm_database`).
- `mod-media/.env.example` contiene una ruta absoluta local en `OCI_CONFIG_FILE_PATH`; eso no es portable.
- `mod-media/Info OCI Oracle/` contiene material sensible o semisensible de configuracion y no debe tratarse como artefacto normal de migracion.

---

## Repositorios destino

La separacion objetivo sigue siendo esta:

1. `crm-infra`
   URL: `https://github.com/SebasCarvajal11/crm-infra.git`
2. `crm-auth`
   URL: `https://github.com/SebasCarvajal11/crm-auth.git`
3. `crm-collab`
   URL: `https://github.com/SebasCarvajal11/crm-collab.git`
4. `crm-media`
   URL: `https://github.com/SebasCarvajal11/crm-media.git`
5. `crm-frontend`
   URL: `https://github.com/SebasCarvajal11/crm-frontend.git`

---

## Estrategia general

No se va a migrar por "copiar carpetas".

Se va a trabajar asi:

1. Congelar una linea base verificable en este repo.
2. Corregir inconsistencias que harian fracasar la separacion.
3. Extraer primero la infraestructura.
4. Extraer luego un backend a la vez.
5. Extraer el frontend al final.
6. Validar integracion al terminar cada etapa.

El repo actual sigue siendo la fuente de verdad hasta terminar la ultima etapa y pasar la validacion final.

---

## Regla de historial Git

No copiar y pegar carpetas.

Para preservar historial se debe usar `git filter-repo`.

Instalacion sugerida:

```powershell
py -m pip install git-filter-repo
```

Verificacion:

```powershell
git filter-repo --help
```

---

## Etapa 0 - Linea base y saneamiento previo

Esta etapa es obligatoria. No se extrae ningun repo antes de cerrarla.

### Objetivo

Dejar el repo actual en un estado que:

- pueda arrancar completo,
- pueda probarse,
- tenga configuracion coherente,
- y no arrastre errores de entorno al momento de separar repos.

### Tareas

1. Confirmar baseline tecnico del monorepo actual.
2. Normalizar documentacion y comandos para `pnpm`.
3. Revisar y limpiar `package-lock.json` de cada modulo.
4. Corregir inconsistencias en `.env.example`.
5. Decidir tratamiento de secretos, claves OCI y archivos locales sensibles.
6. Definir evidencia de pruebas por modulo.
7. Crear un tag o commit de referencia previo a la migracion.

### Archivos que deben revisarse y posiblemente ajustarse en esta etapa

- `package.json` raiz
- `start-project.ps1`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `gateway/.env.example`
- `mod-auth/.env.example`
- `mod-collab/.env.example`
- `mod-media/.env.example`
- `mod-collab/README.md`
- cualquier `package-lock.json`

### Baseline de pruebas minima antes de migrar

1. Infra local:

```powershell
docker compose up -d
```

2. Auth:

```powershell
cd mod-auth
pnpm install
pnpm test
```

3. Auth rate limit via gateway:

```powershell
pnpm test:rate-limit
```

4. Collab smoke via gateway:

```powershell
cd ..\mod-collab
pnpm install
pnpm test:smoke:gateway
```

5. Media build minimo:

```powershell
cd ..\mod-media
pnpm install
pnpm build
```

6. Frontend:

```powershell
cd ..\crm-frontend
pnpm install
pnpm build
```

7. Gateway build:

```powershell
cd ..
node gateway/build-krakend.mjs
```

8. Flujo funcional manual minimo:

- login de admin,
- creacion de proyecto,
- creacion de tarea,
- subida de archivo,
- acceso a workspace,
- lectura de panel principal.

### Go/No-Go

Go si:

- auth tests pasan,
- collab smoke pasa,
- frontend build pasa,
- media build pasa,
- gateway genera `krakend.json`,
- y el flujo manual critico funciona.

No-Go si:

- falla cualquier prueba base,
- existen diferencias de entorno no documentadas,
- o hay secretos embebidos que aun no se han tratado.

### Rollback

No hay cambios estructurales todavia. Si algo falla, se corrige en este mismo repo antes de continuar.

---

## Etapa 1 - Definir contrato de separacion

Esta etapa documenta que va en cada repo y que queda fuera.

### Objetivo

Evitar extraer repos incompletos o demasiado acoplados al repo original.

### Distribucion objetivo

#### `crm-infra`

Debe incluir como minimo:

- `gateway/`
- `scripts/`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `krakend.json`
- `GATEWAY.md`
- `start-project.ps1`
- `start-project.cmd`
- `package.json` raiz o equivalente necesario para `yaml`
- `.gitignore`
- `comandos-utiles.md`
- este `Migracion.md` si quieres mantener la bitacora operativa en infra

No debe depender de tener `mod-auth`, `mod-collab`, `mod-media` o `crm-frontend` dentro del mismo repo para poder:

- levantar Docker,
- regenerar KrakenD,
- documentar variables,
- y servir como entorno local comun.

#### `crm-auth`

Debe incluir:

- todo `mod-auth/` como raiz del repo

#### `crm-collab`

Debe incluir:

- todo `mod-collab/` como raiz del repo

#### `crm-media`

Debe incluir:

- todo `mod-media/` como raiz del repo

Hay que decidir explicitamente si `Info OCI Oracle/`:

- se elimina del repo,
- se reemplaza por placeholders,
- o se mueve a un repositorio privado de secretos/ops.

No debe viajar tal cual por defecto.

#### `crm-frontend`

Debe incluir:

- todo `crm-frontend/` como raiz del repo

### Go/No-Go

Go si ya esta claro que archivos quedan en cada destino.

No-Go si aun hay scripts de arranque, builds o docs que dependen de rutas antiguas del monorepo sin haber sido identificadas.

### Rollback

Todavia no hay extraccion. Se corrige el contrato y se sigue.

---

## Etapa 2 - Extraccion controlada de `crm-infra`

Se extrae primero infraestructura porque el resto de repos va a depender de ella para integrarse y probarse.

### Objetivo

Tener un repo `crm-infra` que levante contenedores y gateway sin necesitar que el codigo este dentro del mismo repo.

### Extraccion sugerida

Trabajar siempre sobre un clon temporal del repo actual, no sobre la copia viva donde sigues desarrollando.

Ejemplo:

```powershell
git clone . ..\tmp-crm-infra
cd ..\tmp-crm-infra
git filter-repo ^
  --path gateway ^
  --path scripts ^
  --path docker-compose.yml ^
  --path docker-compose.prod.yml ^
  --path krakend.json ^
  --path GATEWAY.md ^
  --path package.json ^
  --path .gitignore ^
  --path start-project.ps1 ^
  --path start-project.cmd ^
  --path comandos-utiles.md ^
  --path Migracion.md
```

Luego:

```powershell
git remote remove origin
git remote add origin https://github.com/SebasCarvajal11/crm-infra.git
```

### Ajustes esperados dentro de `crm-infra`

1. Verificar que `pnpm install` funcione en la raiz.
2. Verificar que `node gateway/build-krakend.mjs` siga funcionando.
3. Ajustar `start-project.ps1` para que ya no asuma que los modulos viven en subcarpetas del mismo repo.
4. Reemplazar el arranque de modulos por referencias a rutas externas configurables o por un documento operativo.
5. Mantener `host.docker.internal` para desarrollo local, como ya hace el gateway.

### Pruebas obligatorias

```powershell
pnpm install
node gateway/build-krakend.mjs
docker compose up -d
docker compose ps
```

Si el gateway queda apuntando a servicios externos en host:

- verificar `http://localhost:8080/health`
- verificar regeneracion de `krakend.json`

### Go/No-Go

Go si `crm-infra`:

- instala dependencias,
- regenera KrakenD,
- levanta Docker,
- y documenta claramente como conectar microservicios externos.

No-Go si el repo aun depende de rutas como `.\mod-auth`, `.\mod-collab`, `.\mod-media` o `.\crm-frontend` para funcionar.

### Rollback

Descartar el clon filtrado y volver a intentar. El repo original no se toca.

---

## Etapa 3 - Extraccion de `crm-auth`

Se empieza por auth porque:

- es proveedor de identidad,
- expone JWKS,
- y varias pruebas del sistema dependen de el.

### Extraccion

```powershell
git clone . ..\tmp-crm-auth
cd ..\tmp-crm-auth
git filter-repo --subdirectory-filter mod-auth
git remote remove origin
git remote add origin https://github.com/SebasCarvajal11/crm-auth.git
```

### Ajustes esperados

1. Confirmar que `pnpm-workspace.yaml` no quede arrastrado.
2. Eliminar `package-lock.json` si aparece y se decide estandarizar solo `pnpm`.
3. Confirmar que `.env.example` sigue completo y portable.
4. Confirmar que workers (`worker:email`, `worker:cleanup`) quedan documentados.
5. Confirmar que `README.md` habla solo de `pnpm`.

### Pruebas obligatorias

```powershell
pnpm install
pnpm build
pnpm test
pnpm test:rate-limit
```

Adicional:

- verificar `http://localhost:3000/health`
- verificar `http://localhost:3000/.well-known/jwks.json`

### Go/No-Go

Go si el repo extraido ejecuta sus pruebas y puede arrancar aislado con su `.env`.

No-Go si auth necesita archivos fuera de su propia raiz para build, pruebas o runtime.

### Rollback

Descartar el repo filtrado. Mantener auth corriendo desde el repo original mientras se corrige.

---

## Etapa 4 - Extraccion de `crm-collab`

No debe iniciarse hasta que `crm-auth` y `crm-infra` ya hayan sido validados.

### Extraccion

```powershell
git clone . ..\tmp-crm-collab
cd ..\tmp-crm-collab
git filter-repo --subdirectory-filter mod-collab
git remote remove origin
git remote add origin https://github.com/SebasCarvajal11/crm-collab.git
```

### Ajustes esperados

1. Corregir `README.md` para usar `pnpm`, no `npm`.
2. Normalizar `.env.example` para que la base y puertos coincidan con el stack real.
3. Documentar claramente dependencias externas:
   - `MOD_AUTH_URL=http://localhost:3000`
   - `MOD_MEDIA_URL=http://localhost:3002`
4. Documentar requerimientos OCI sin rutas locales personales.
5. Confirmar scripts de worker y limpieza OCI.

### Pruebas obligatorias

```powershell
pnpm install
pnpm build
pnpm test:smoke:gateway
```

Adicional:

- levantar `crm-auth`
- levantar `crm-media`
- levantar `crm-infra`
- arrancar `crm-collab`
- verificar `http://localhost:3001/health`

### Go/No-Go

Go si collab funciona contra auth y media externos, via URLs, no por estructura de carpetas.

No-Go si depende de material local no portable o si falla el smoke test via gateway.

### Rollback

Volver a usar `mod-collab` desde el repo original.

---

## Etapa 5 - Extraccion de `crm-media`

Esta etapa necesita mas cuidado por OCI, ClamAV y validaciones cruzadas con collab.

### Extraccion

```powershell
git clone . ..\tmp-crm-media
cd ..\tmp-crm-media
git filter-repo --subdirectory-filter mod-media
git remote remove origin
git remote add origin https://github.com/SebasCarvajal11/crm-media.git
```

### Ajustes esperados

1. Revisar si `Info OCI Oracle/` debe salir del repo.
2. Reemplazar rutas absolutas en `.env.example`.
3. Asegurar que `MOD_COLLAB_URL` quede documentado si es necesario para validaciones internas.
4. Confirmar dependencia de ClamAV (`CLAMAV_HOST`, `CLAMAV_PORT`).
5. Crear smoke tests faltantes si aun no existen.

### Pruebas obligatorias

```powershell
pnpm install
pnpm build
pnpm oci:verify
```

Adicional:

- verificar `http://localhost:3002/health`
- probar upload de avatar
- probar upload de documento
- probar generacion de acceso controlado a documento

### Go/No-Go

Go si media puede ejecutarse con:

- DB,
- ClamAV,
- OCI,
- y `mod-collab` externo.

No-Go si quedan secretos versionados, rutas absolutas o dependencias locales personales.

### Rollback

Mantener `mod-media` en el repo original hasta sanear configuracion y pruebas.

---

## Etapa 6 - Extraccion de `crm-frontend`

El frontend se deja al final porque es el consumidor de todo el stack.

### Extraccion

```powershell
git clone . ..\tmp-crm-frontend
cd ..\tmp-crm-frontend
git filter-repo --subdirectory-filter crm-frontend
git remote remove origin
git remote add origin https://github.com/SebasCarvajal11/crm-frontend.git
```

### Ajustes esperados

1. Confirmar que `VITE_API_BASE_URL` siga usando `/api` por defecto.
2. Mantener `vite.config.ts` con proxy a `http://localhost:8080`.
3. Mantener `nginx.conf` de produccion alineado con `crm-infra`.
4. Confirmar que los tipos duplicados locales sigan siendo la fuente de verdad por ahora.

No conviene en esta migracion introducir un paquete compartido de tipos. Eso seria otra migracion distinta.

### Pruebas obligatorias

```powershell
pnpm install
pnpm build
```

Adicional:

- correr `pnpm dev`
- login via gateway
- abrir dashboard
- crear proyecto
- crear tarea
- ver archivos y chat

### Go/No-Go

Go si el frontend funciona sin depender del repo original y toda llamada va por KrakenD.

No-Go si aparecen imports o rutas de build que asumian estructura antigua.

### Rollback

Seguir usando `crm-frontend` desde el repo original hasta resolverlo.

---

## Etapa 7 - Integracion multi-repo en local

Solo empieza cuando los 5 repos existen y cada uno ya fue validado de forma aislada.

### Objetivo

Demostrar que el sistema completo funciona con cada modulo viviendo en su propio repo.

### Topologia local objetivo

- `crm-infra` levanta Postgres, Redis, ClamAV y KrakenD.
- `crm-auth` corre en `localhost:3000`.
- `crm-collab` corre en `localhost:3001`.
- `crm-media` corre en `localhost:3002`.
- `crm-frontend` corre en `localhost:5173`.

### Variables criticas

#### Secretos compartidos

El mismo valor de `GATEWAY_TRUST_SECRET` debe estar en:

- `crm-infra`
- `crm-auth`
- `crm-collab`
- `crm-media`

#### Enlaces entre servicios

En `crm-collab`:

- `MOD_AUTH_URL=http://localhost:3000`
- `MOD_MEDIA_URL=http://localhost:3002`

En `crm-media`:

- `MOD_COLLAB_URL=http://localhost:3001` si el flujo interno lo requiere

En `crm-frontend`:

- `VITE_API_BASE_URL=/api`

### Secuencia de arranque sugerida

1. `crm-infra`

```powershell
pnpm install
node gateway/build-krakend.mjs
docker compose up -d
```

2. `crm-auth`

```powershell
pnpm install
pnpm dev
```

Si usa cola de correo:

```powershell
pnpm worker:email
```

3. `crm-collab`

```powershell
pnpm install
pnpm dev
```

4. `crm-media`

```powershell
pnpm install
pnpm dev
```

5. `crm-frontend`

```powershell
pnpm install
pnpm dev
```

### Pruebas de integracion obligatorias

1. Health checks:
   - `:8080/health`
   - `:3000/health`
   - `:3001/health`
   - `:3002/health`
2. `mod-auth`:
   - login
   - refresh
   - `me`
3. `mod-collab`:
   - smoke Hurl por gateway
4. `mod-media`:
   - upload y acceso a documento
5. Frontend:
   - login
   - dashboard
   - crear proyecto
   - crear tarea
   - subir archivo
   - ver timeline o workspace

### Go/No-Go

Go si el stack completo funciona usando solo repos separados.

No-Go si algun modulo aun depende del repo original o si el gateway no enruta correctamente hacia servicios externos.

### Rollback

Volver temporalmente al repo original como entorno de integracion mientras se corrige el repo aislado que fallo.

---

## Etapa 8 - Corte final

Solo cuando la integracion multi-repo ya sea estable.

### Objetivo

Cambiar la operacion diaria del equipo del repo unico a repos separados.

### Checklist

1. Cada repo tiene `README.md` actualizado.
2. Cada repo tiene `.env.example` util y portable.
3. Cada repo usa `pnpm`.
4. Cada repo tiene lockfile coherente.
5. Cada repo tiene remote correcto.
6. `crm-infra` documenta como levantar todo el stack.
7. El repo original queda:
   - archivado, o
   - convertido en meta-repo solo documental, o
   - mantenido temporalmente en solo lectura.

### Recomendacion

No borrar el repo original inmediatamente.

Primero:

- hacer tag de cierre,
- dejarlo en solo lectura,
- y conservarlo un tiempo como referencia historica de la migracion.

---

## Riesgos principales y mitigaciones

### 1. Perder historial Git

Mitigacion:

- usar `git filter-repo`
- no copiar carpetas manualmente

### 2. Romper el arranque local

Mitigacion:

- extraer `crm-infra` primero
- desacoplar `start-project.ps1` de rutas internas del monorepo

### 3. Variables de entorno inconsistentes

Mitigacion:

- corregir `.env.example` antes de extraer
- documentar una matriz de variables por repo

### 4. Secretos o archivos sensibles filtrados

Mitigacion:

- revisar `Info OCI Oracle/`
- revisar claves `.pem`, `.key`, config OCI
- mover secretos a almacenamiento adecuado

### 5. Pruebas insuficientes en `mod-media`

Mitigacion:

- agregar smoke tests minimos antes o durante la migracion de ese repo

### 6. Dualidad `pnpm` / `npm`

Mitigacion:

- eliminar `package-lock.json` donde aplique
- corregir READMEs y comandos
- mantener `preinstall: npx only-allow pnpm`

### 7. Dependencia accidental del repo original

Mitigacion:

- probar cada repo por separado
- luego probar integracion real entre repos

---

## Matriz minima de variables por repo

### `crm-infra`

- `GATEWAY_TRUST_SECRET`
- `KRAKEND_AUTH_HOST`
- `KRAKEND_COLLAB_HOST`
- `KRAKEND_MEDIA_HOST`
- `CORS_ORIGINS`
- `APP_PUBLIC_URL`
- `JWT_PUBLIC_KEY`
- `JWT_KID`

### `crm-auth`

- `DATABASE_URL`
- `PORT`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `JWT_KID`
- `TRUST_GATEWAY_JWT_HEADERS`
- `GATEWAY_TRUST_SECRET`
- `APP_PUBLIC_URL`
- `MAIL_*`

### `crm-collab`

- `DATABASE_URL`
- `PORT`
- `CORS_ORIGIN`
- `TRUST_GATEWAY_JWT_HEADERS`
- `GATEWAY_TRUST_SECRET`
- `MOD_AUTH_URL`
- `MOD_MEDIA_URL`
- `OCI_*`

### `crm-media`

- `DATABASE_URL`
- `PORT`
- `MOD_COLLAB_URL`
- `OCI_*`
- `CLAMAV_*`
- `GATEWAY_TRUST_SECRET` si el flujo interno lo exige

### `crm-frontend`

- `VITE_API_BASE_URL`

---

## Orden recomendado de ejecucion real

Este es el orden recomendado para trabajar la migracion:

1. Cerrar Etapa 0.
2. Extraer y validar `crm-infra`.
3. Extraer y validar `crm-auth`.
4. Extraer y validar `crm-collab`.
5. Extraer y validar `crm-media`.
6. Extraer y validar `crm-frontend`.
7. Hacer integracion multi-repo.
8. Hacer corte final.

No avanzar al siguiente paso si el anterior no esta probado.

---

## Primera ejecucion recomendada

La siguiente accion concreta no es extraer repos todavia.

La siguiente accion correcta es cerrar Etapa 0 con estos items:

1. Verificar baseline de pruebas del repo actual.
2. Normalizar `.env.example`.
3. Detectar y resolver `package-lock.json` sobrantes.
4. Corregir documentacion que aun usa `npm`.
5. Definir que hacer con `mod-media/Info OCI Oracle/`.

Cuando eso este listo, el primer repo a extraer debe ser `crm-infra`.

---

## Estado de ejecucion

Estado real de la migracion a la fecha:

- Etapa 0: cerrada
- Etapa 1: cerrada
- Etapa 2: cerrada
- Etapa 3: cerrada
- Etapa 4: cerrada
- Etapa 5: cerrada
- Etapa 6: cerrada
- Etapa 7: cerrada
- Etapa 8: en cierre operativo

Validaciones ya ejecutadas sobre el stack separado:

- `pnpm verify:multirepo` en `D:\BACKUP CELULAR OLIMPO\crm-infra`
- `pnpm verify:frontend-ui` en `D:\BACKUP CELULAR OLIMPO\crm-infra`

Decision operativa actual:

- el entorno multi-repo ya puede considerarse la referencia principal;
- este monorepo debe quedar como `legacy`, en solo lectura o archivado cuando el equipo cierre el cambio operativo;
- la siguiente linea de trabajo ya no es migracion tecnica, sino CI/CD y estandarizacion por repositorio.
