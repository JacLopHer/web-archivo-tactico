# Infinity Datacards

Aplicación web en React y TypeScript para consultar perfiles y preparar tarjetas de Infinity. El piloto actual se centra exclusivamente en JSA.

## Flujo MVP

1. Copia una lista de perfiles JSA o una lista de Infinity Army en el portapapeles y pulsa «Importar lista»; la app la lee y analiza directamente.
2. Para Infinity Army, se extraen perfiles, grupos de combate, armamento y costes CAP/puntos. Antes de importar se muestra una confirmación con el recuento de unidades validadas y no validadas.
3. Al aceptar, las coincidencias seguras se añaden a la lista conservando grupos y duplicados. Las unidades ambiguas o no incluidas en el catálogo se omiten con un aviso para añadirlas manualmente desde el catálogo.
4. El catálogo organiza las unidades y sus perfiles en tres pasos: elige una clase de tropa (IL, IM, IP, BAT, WB, REM, TAG; cada una con su color), selecciona una unidad (por ejemplo, Ninja), elige una variante por su equipo y reglas propias, y añádela a la lista con el botón «Añadir» o con doble clic sobre la variante. La lista conserva grupos, orden y duplicados; permite reordenar o quitar fichas. «Limpiar» vacía la lista tras confirmación. El buscador localiza unidades de cualquier clase sin pasar por el selector de clases, y el panel de perfiles muestra el icono de la unidad.
5. Crea y cambia entre proyectos, renómbralos o elimínalos con confirmación. El proyecto activo se guarda automáticamente en el almacenamiento local del navegador.
6. Descarga una copia de seguridad JSON de tus proyectos o añade proyectos de un archivo de copia como copias, sin reemplazar los que ya tienes.

La importación de listas acepta el texto copiado de Infinity Army, incluidas las etiquetas BBCode y las imágenes de facción/unidad/grupo; no procesa directamente el enlace codificado ni archivos externos. «Importar lista» requiere permiso del navegador para leer el portapapeles y un contexto seguro (localhost o HTTPS). Antes de añadir unidades se muestra una confirmación con las validadas y las no validadas. Al aceptar, las unidades resueltas de forma segura se añaden; las ambiguas o sin perfil en el catálogo se omiten con un aviso para que se añadan manualmente desde el catálogo. Las resoluciones siempre apuntan a perfiles del catálogo; el armamento y el coste importados ayudan a distinguir variantes, pero no sobrescriben los datos del catálogo. Las copias de seguridad JSON contienen solo tus proyectos y listas personales, no el catálogo; al importarlas, los proyectos se añaden con nombres de copia y se conservan los existentes y el proyecto activo. Las fichas se validan contra el catálogo actual. Los proyectos se guardan en `localStorage` y solo están disponibles en el mismo navegador y origen; no se sincronizan entre dispositivos ni usuarios, y pueden borrarse al limpiar los datos del navegador. Se muestra el estado del guardado y los errores; los datos locales inválidos no se reemplazan sin confirmación. La tabla detallada de armas está disponible al seleccionar una variante del catálogo; las fichas añadidas muestran atributos compartidos de la unidad y el equipo y las reglas diferenciales del perfil.

Las insignias SVG de unidades se guardan localmente en `public/units/icons/` y se sirven desde los recursos de Infinity Army (`assets.corvusbelli.net/army/img/logo/units/`). Las variantes y nombres heredados del catálogo se asignan al slug oficial de su unidad; unidades sin un recurso oficial disponible conservan la búsqueda del PNG local.

## Pendiente y siguiente paso

- **Siguiente paso funcional recomendado:** seguir probando el importador con listas reales de Infinity Army y ampliar las pruebas de interfaz.
- Las copias de seguridad JSON descargan y recuperan los proyectos y sus listas personales (nombres, fichas, orden y grupos), por ejemplo al cambiar de navegador o si se borran los datos locales. La importación añade copias y no reemplaza los proyectos existentes. No incluyen el catálogo de perfiles o armas; ese catálogo se mantiene actualizado por separado.
- **Pendiente de datos:** Ruby Monday y Kobaruto no tienen clase de tropa (no figuran en Human Sphere); hay que confirmarla con el propietario. Los sectoriales siguen desactivados.
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

Las unidades y perfiles de tropas JSA y las referencias se migraron desde una herramienta local heredada a `src/data/legacyJsaCatalog.json`. Cada unidad contiene atributos y reglas especiales compartidos, y su lista `profiles` conserva las variantes de equipo, costes y reglas diferenciales. Cada variante retiene su ID estable y su nombre heredado para que la importación pueda resolver las listas existentes. Se utilizan en el flujo funcional del MVP por decisión del propietario, sin que eso implique que sus valores se hayan cotejado de nuevo; el catálogo conserva `unverified` como estado de trazabilidad de la fuente. La clase de tropa se guarda separada de `troopType`, con fuente y estado propios; los perfiles la heredan de su unidad y se muestra en el catálogo, las fichas y la impresión. Su procedencia principal es la tabla «Japanese Secessionist Army Units» de [Human Sphere](https://www.human-sphere.com/Japanese_Secessionist_Army), aplicada mediante mapeos explícitos en `src/domain/troopClasses.mjs`. Las etiquetas visibles siguen la nomenclatura compartida por el propietario: IL, IM, IP, REM, TAG, BAT — Batidor y WB — Warband. Ioann Bann se clasifica como Warband por confirmación expresa del propietario (2026-10-28). Warcor, Monstrucker, Aïda Swanson y Sāchā (IL), Yuan Yuan (WB), Samsa y Raiden (IM, perfil N5), Triphammer (TAG) y Turtlemek (REM) se clasifican según sus páginas individuales de Human Sphere, que constan como fuente de cada unidad. Ruby Monday y Kobaruto siguen sin clasificar. El catálogo incluye `troopClassGroups` (clase → unidades) y la sección Unidades muestra primero las clases; al elegir una se listan sus unidades y el buscador sigue localizando cualquier unidad. Las unidades no incluidas en la tabla y las entradas que no coinciden con el catálogo se mantienen sin asignación y se notifican al ejecutar `npm run migrate:legacy`; las copias de seguridad y proyectos no guardan esta clasificación derivada. Los perfiles de armas viven por separado en `src/data/weaponProfiles.json` para que otras facciones puedan reutilizarlas sin duplicar sus datos. Cada perfil conserva su fuente y estado de verificación.

Se han contrastado directamente 176 perfiles con las páginas impresas 183–196 de la tabla de armas del PDF N5 actualización 5.3. Además, el usuario confirmó 13 variantes `(+1R)`, 23 variantes de Arma CC con distintos PS, Mk12(AP) y Pulso Flash(PS=6). También confirmó los diez registros genéricos cuyos modos tienen perfiles separados, verificados directamente con el PDF. Las tres variantes de Torreta Artillada usan el perfil del arma indicada entre paréntesis, conforme a la regla [Armed Turret](https://infinitythewiki.com/Armed_Turret), y sus valores coinciden con Fusil Combi o Fusil AP. En total, los 227 perfiles de arma están verificados; 176 tienen fuente directa del PDF y los demás registran la validación del usuario o la regla Wiki aplicable. ECM: Hacker [-6] y Cobertura Desplegable son equipo automático, mientras que KOBARUTO y TURTLEMEK son periféricos REM; ninguno se incluye en el catálogo de armas. El cotejo página a página detectó también perfiles ausentes que se añadieron al catálogo. Los modificadores negros de alcance se guardan como `--` y se muestran sin texto; la paleta de modificadores sigue la referencia visual compartida. Los perfiles de minas conservan las notas de despliegue y alias históricos del catálogo. La asignación de perfiles de tropas a sectoriales permanece desactivada hasta poder verificarla.

Para regenerar los perfiles de tropas y la copia heredada de perfiles de armas desde el HTML local (no incluido en el repositorio, debe estar disponible en la raíz):

```powershell
npm run migrate:legacy
```

La migración conserva el estado y la fuente de perfiles de armas sin cambios, identificados por su ID estable. El HTML de origen, los PDF y las láminas de referencia de facciones son material local y están excluidos de este repositorio.
