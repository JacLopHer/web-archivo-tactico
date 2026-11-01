# Infinity Datacards

Aplicación web en React y TypeScript para consultar perfiles y preparar tarjetas de Infinity. El catálogo incluye JSA y los rosters N5 de PanOceanía, Yu Jing, Ariadna, Haqqislam, Nómadas, Aleph, Ejército Combinado, Tohaa, O-12 y Non-Aligned con sus sectoriales, con disponibilidad consultada directamente en Infinity Army.

## Flujo MVP

1. Copia una lista de perfiles o una lista de Infinity Army en el portapapeles y pulsa «Importar lista»; la app la lee y analiza directamente.
2. Para Infinity Army, se extraen perfiles, grupos de combate, armamento y costes CAP/puntos. Antes de importar se muestra una confirmación con el recuento de unidades validadas y no validadas.
3. Al aceptar, las coincidencias seguras se añaden a la lista conservando grupos y duplicados. Las unidades ambiguas o no incluidas en el catálogo se omiten; antes de aceptar, la confirmación muestra sus nombres y grupo para que puedas revisarlas.
4. Elige la facción y, si hay datos verificados, un sectorial. El catálogo organiza las unidades y sus perfiles en tres pasos: elige una clase de tropa (IL, IM, IP, BAT, WB, REM, TAG, VH; cada una con su color), selecciona una unidad, elige una variante por su equipo y reglas propias, y añádela a la lista con «Añadir» o doble clic. JSA sigue siendo la selección inicial. La lista conserva grupos, orden y duplicados; permite reordenar o quitar fichas. «Limpiar» vacía la lista tras confirmación. El buscador localiza unidades de cualquier clase sin pasar por el selector de clases, y las unidades sin recurso autorizado conservan el marcador existente.
5. Crea y cambia entre proyectos, renómbralos o elimínalos con confirmación. El proyecto activo se guarda automáticamente en el almacenamiento local del navegador.
6. Descarga una copia de seguridad JSON de tus proyectos o añade proyectos de un archivo de copia como copias, sin reemplazar los que ya tienes.
7. «Vista previa» abre las hojas A4 verticales (el papel es siempre A4). El formato por defecto es **Compacto · 10 por hoja** (2 columnas × 5 filas, márgenes de 6 mm de hoja y sin separación entre fichas); **Detallado · 3 por hoja** coloca cada ficha en un tercio exacto de la página (márgenes de 10 mm, sin separación entre fichas). Cada ficha se reduce por separado solo si no cabe en su celda; si ocupa menos, el resto queda vacío dentro del marco de la propia ficha. Saltos de página: «Automáticos» y «Al inicio de cada grupo» abren hoja nueva en cada grupo (los grupos que superan la hoja se reparten) y «Una ficha por página» pone una por hoja. La cuadrícula y los márgenes se definen en `src/domain/printLayout.mjs`. La impresión A4 se ha validado en papel real (28-10-2026).

La importación de listas acepta el texto copiado de Infinity Army, incluidas las etiquetas BBCode y las imágenes de facción/unidad/grupo; no procesa directamente el enlace codificado ni archivos externos. «Importar lista» requiere permiso del navegador para leer el portapapeles y un contexto seguro (localhost o HTTPS). Antes de añadir unidades se muestra una confirmación con las validadas y las no validadas; en estas últimas se listan los nombres visibles y el grupo, incluidos los nombres repetidos si hay varias entradas. Al aceptar, las unidades resueltas de forma segura se añaden; las ambiguas o sin perfil en el catálogo se omiten para añadirlas manualmente. Las resoluciones siempre apuntan a perfiles del catálogo; el armamento y el coste importados ayudan a distinguir variantes, pero no sobrescriben los datos del catálogo. Las copias de seguridad JSON contienen solo tus proyectos y listas personales, no el catálogo; al importarlas, los proyectos se añaden con nombres de copia y se conservan los existentes y el proyecto activo. Las fichas se validan contra el catálogo actual. Los proyectos se guardan en `localStorage` y solo están disponibles en el mismo navegador y origen; no se sincronizan entre dispositivos ni usuarios, y pueden borrarse al limpiar los datos del navegador. Se muestra el estado del guardado y los errores; los datos locales inválidos no se reemplazan sin confirmación. La tabla detallada de armas está disponible al seleccionar una variante del catálogo; el nombre de un arma con modificador (p. ej. `Granadas(PS=6)`) se resuelve siempre al arma base y el modificador se muestra como texto, las armas con modos generan una fila por modo, y el equipo automático (ECM, Cobertura Desplegable, KOBARUTO, TURTLEMEK) se marca como «Equipo» sin aviso de perfil; las fichas añadidas muestran atributos compartidos de la unidad y el equipo y las reglas diferenciales del perfil.

Los iconos SVG oficiales de unidad enlazados por Infinity Army se guardan localmente en `public/units/icons/`; se registran sus URLs de procedencia en el catálogo. El propietario autorizó su uso el 2026-11-01. Los iconos de facción no forman parte de esta incorporación y conservan el marcador genérico.

## Catálogo de Nómadas y Aleph

- `src/data/nomadsAlephCatalog.json` cubre 275 IDs de unidad únicos, representados por 326 grupos de perfil, con 1.024 perfiles en Nómadas genérico, Corregidor, Bakunin, Tunguska, Aleph genérica, Steel Phalanx y OSS. Se conservan nombres de Infinity Army en español e inglés, puntos, CAP, atributos, tipo/clase, habilidades, equipo, armamento y disponibilidad individual por perfil/sectorial.
- La fuente es el roster vigente de Infinity Army, edición de trabajo N5.3. La API no expone el campo de edición; la limitación y versiones por facción están registradas en `metadata`. No se combinaron fuentes de reglas de otras ediciones.
- `npm run catalog:nomads-aleph` consulta los siete rosters en español e inglés, verifica versiones, IDs, traducciones y referencias antes de regenerar. El proceso protege el contenido previo contra cambios no revisados y descarga los iconos SVG enlazados por los propios perfiles, sin sobrescribir recursos locales distintos.
- Hay 115 fichas de arma. Siete quedan marcadas como incompletas porque la API no expone nombre de munición o ficha de arma; doce grupos contienen varios perfiles base cuyo vínculo con cada opción de equipo no está explícito. Esos datos se conservan y se señalan, sin inferir asociaciones ni completar valores.
- Se descargaron 249 iconos SVG de unidad con la autorización indicada por el propietario; los iconos de facción permanecen genéricos. `src/data/factionDirectory.json` marca Nómadas y Aleph como catálogo completo para los siete rosters.

## Ampliación a los ejércitos genéricos N5

- `src/data/armies/*.json` añade PanOceanía (199 unidades / 767 perfiles, 7 sectoriales), Yu Jing (154 / 520, 4), Ariadna (157 / 521, 6), Haqqislam (154 / 508, 4), Ejército Combinado (190 / 643, 5), Tohaa (102 / 266, 1), O-12 (139 / 431, 3) y Non-Aligned (195 / 636, mercenarios genéricos más Druze, Ikari, Starco, Dahshat y White Company). Se cargan de forma diferida (`src/data/extraCatalogs.ts`).
- `npm run catalog:build` regenera todo; `node scripts/buildCatalog.mjs <conjunto> [--skip-icons] [--icon-mirror]` genera uno (`scripts/catalogSets.mjs`). `--icon-mirror` descarga los SVG de `assets.corvusbelli.com` (bytes idénticos) cuando `assets.corvusbelli.net` no responde, y conserva la URL `.net` como procedencia.
- Los perfiles con datos que la API no ofrece (arma sin nombre, etc.) se marcan `incomplete` y `disabled`, pero siguen siendo importables. Si los perfiles base de una unidad difieren entre sectoriales, el generador falla salvo que esté en `allowBaseSplits`: Moblots (Ariadna 233, FRRM), Shihab (Haqqislam 316) y Khawarijs (Haqqislam 303, RTF) se separan en unidades `-b<hash>`.
- **Fuera de esta fase:** compañías (`x99`), refuerzos contratados (998/999), Spec-Ops y Team-Ops propios de facción (están en los rosters pero se tratan como perfiles normales; sin tratamiento de mejoras). Las banderas «discontinued» de la API se ignoran: los rosters existen y coinciden con las imágenes N5 v4.
- Importación: `matchesSectorialHint` usa los slugs de logotipo confirmados en los metadatos; `non-aligned-armies` → `non-aligned-generic` y `operations` → `aleph-oss` son excepciones. `scripts/testArmyCatalogs.test.mjs` cubre identidad, datos obligatorios, fuente, edición, disponibilidad, iconos, JSA intacto e importación por sectorial.
- Cotejo con las imágenes N5 v4 (solo referencia local): ninguna unidad dibujada falta en los rosters, salvo en `combined-army-generic` (Pandora, solo en Next Wave, y Umbra Samaritans, solo en Onyx y marcada fuera de producción) y `yu-jing-imperial-service` (Yudbots, sin ID). El roster añade respecto a las imágenes mercenarios, Spec-Ops/Team-Ops, Lazhari (Haqqislam), Krakot (CA genérico), Yáozǎo (Yu Jing ISS), Cadin (Ariadna genérico) y Firebat (O-12 Starmada). No se copian asignaciones sin fuente. Hay unidades con dos IDs oficiales (p. ej. 1275/11275 Libertos) que la imagen dibuja una vez; el importador las deja ambiguas. Starco: la imagen (06/26) muestra 4 Zonds y el roster 5. No hay imagen de non-aligned genérico.

- **Perfiles incompletos (pendiente, a resolver más adelante):** 243 referencias de arma usan la munición id 0, que no existe en `ammunitions` de los metadatos (17 armas/equipos: MediKit, Dazer, Cibermina, Drop Bears, Disco Baller, Dispersador de Minas…); las armas 144, 209, 215, 219, 222 y 228 no están en los metadatos (ES/EN/FR/DE; IT y PT no responden); y 11 perfiles (Hawkwood 11556/1556, Zulú-Cobra 1216) traen entradas de arma vacías `{}` en el roster. No se infirió nada: esos perfiles siguen `incomplete` y `disabled` (no se muestran en el catálogo, aunque son importables), de modo que algunas unidades enteras, sobre todo Remotos, no aparecen en la UI. Si se decide tratar la munición id 0 como «sin munición», basta cambiar la regla en `buildCatalog.mjs` y regenerar.
- **Unidades con dos IDs oficiales indistinguibles en la UI:** p. ej. Libertos 1275 y 11275 aparecen como dos tarjetas «LIBERTO» iguales en Yu Jing; no se fusionan porque son IDs distintos de la fuente.
- **Verificación en navegador (Playwright, 01-11-2026):** las 11 facciones y todos sus sectoriales se pueden seleccionar; los recuentos por clase coinciden con el catálogo salvo las unidades con todos sus perfiles deshabilitados; búsqueda y alta de ficha, importación de una lista con logotipo `qapu-khalqi` y línea «3X», persistencia al recargar y copia de seguridad funcionan.

## Pendiente y siguiente paso

- Revisar con Infinity Army las siete fichas de arma sin datos completos y el vínculo de los perfiles base múltiples, cuando la fuente aporte una correspondencia verificable.
- Los proyectos y copias de seguridad siguen conservando solo las listas personales, no copias del catálogo. La lista se valida contra el catálogo actual, que se mantiene separado.
- **Clase de tropa completa:** Ruby Monday (IP) y Kobaruto (REM) se clasificaron por confirmación expresa del propietario (2026-10-28). Los sectoriales ya filtran por unidad.
- **Al final:** automatizar pruebas e2e de impresión y del flujo principal, continuar el QA del importador y añadir el modo de aprendizaje.
- **Rediseño visual futuro:** el diseño gráfico actual no convence al propietario y deberá replantearse más adelante. No es el siguiente paso; primero se priorizan las funciones pendientes.

## Despliegue

GitHub Pages es la opción prevista para publicar gratuitamente la app como sitio estático, pero aún no está configurado. No ofrece backend ni sincronización: la persistencia local se queda en el navegador y no se comparte entre dispositivos. `localStorage` también queda separado por origen (por ejemplo, localhost y el dominio de Pages). El sitio de proyecto se servirá bajo `/<nombre-del-repositorio>/`, por lo que habrá que ajustar y probar el `base` de Vite. El catálogo y el código cliente serán públicos. GitHub documenta un máximo de 1 GB por sitio publicado y límites suaves de 100 GB de transferencia mensual y 10 builds por hora; revisar los [límites actuales de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Si la app necesitara cuentas o datos compartidos, haría falta un backend aparte.

## Desarrollo

Requiere Node.js 22 o posterior.

```powershell
npm install
npm run dev
```

## Comprobaciones

```powershell
npm test
npm run build
```

## Catálogo de datos

Las unidades y perfiles de tropas JSA y sus referencias heredadas siguen en `src/data/legacyJsaCatalog.json`, con sus IDs y estado `unverified` intactos. Las unidades solicitadas de Nómadas y Aleph están en `src/data/nomadsAlephCatalog.json`; cada unidad guarda atributos, reglas, características, fuente, edición y AVA por sectorial. Cada perfil conserva IDs de Infinity Army, nombres originales de importación en español e inglés, equipo, armamento, puntos, CAP y los sectoriales en los que realmente aparece. Las armas se transcriben de Infinity Army cuando el nombre está disponible; los datos que la API no ofrece se marcan incompletos. El catálogo separa los trooper types de la clase de tropa, y la búsqueda, proyectos, copia de seguridad e importación consumen el mismo conjunto integrado de perfiles. Los sectores sin unidades verificadas permanecen sin filtro utilizable. Las fichas de facción y sectoriales no implican disponibilidad de unidades más allá de los rosters verificados.

Se han contrastado directamente 176 perfiles con las páginas impresas 183–196 de la tabla de armas del PDF N5 actualización 5.3. Además, el usuario confirmó 13 variantes `(+1R)`, 24 variantes de Arma CC con distintos PS (la de PS=6 confirmada con Infinity Army), Mk12(AP) y Pulso Flash(PS=6). También confirmó los diez registros genéricos cuyos modos tienen perfiles separados, verificados directamente con el PDF. Las tres variantes de Torreta Artillada usan el perfil del arma indicada entre paréntesis, conforme a la regla [Armed Turret](https://infinitythewiki.com/Armed_Turret), y sus valores coinciden con Fusil Combi o Fusil AP. En total, los 228 perfiles de arma están verificados; 176 tienen fuente directa del PDF y los demás registran la validación del usuario o la regla Wiki aplicable. ECM: Hacker [-6] y Cobertura Desplegable son equipo automático, mientras que KOBARUTO y TURTLEMEK son periféricos REM; ninguno se incluye en el catálogo de armas. El cotejo página a página detectó también perfiles ausentes que se añadieron al catálogo. Los modificadores negros de alcance se guardan como `--` y se muestran sin texto; la paleta de modificadores sigue la referencia visual compartida. Los perfiles de minas conservan las notas de despliegue y alias históricos del catálogo. Los sectoriales ya filtran el catálogo por unidad (ver arriba).

Para regenerar los perfiles de tropas y la copia heredada de perfiles de armas desde el HTML local (no incluido en el repositorio, debe estar disponible en la raíz):

```powershell
npm run migrate:legacy
```

La migración conserva el estado y la fuente de perfiles de armas sin cambios, identificados por su ID estable. El HTML de origen, los PDF y las láminas de referencia de facciones son material local y están excluidos de este repositorio.
