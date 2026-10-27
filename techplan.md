# PROMPT MAESTRO — INFINITY DATACARDS

## Estado de ejecución y deuda técnica (27-10-2026)

### Decisión de alcance

- Los perfiles de tropa JSA heredados se utilizan en el flujo MVP por decisión del propietario, pero esto no constituye un cotejo nuevo de sus valores. Se conserva su estado `unverified` y la procedencia heredada.
- La clasificación de clase de tropa (por ejemplo, Infantería Ligera, Media o Pesada) queda pendiente de modelado. El campo `troopType` existente contiene categorías distintas, como T. Línea, T. Apoyo, REM o TAG; no se debe presentar como equivalente.
- La disponibilidad sectorial sigue pendiente: no se asignan perfiles a sectoriales ni se habilitan esos filtros sin evidencia específica.

### Flujo MVP implementado

- Catálogo piloto JSA con búsqueda, ficha de detalle y perfiles de armas separados.
- Pegado de una lista de perfiles por línea o del texto copiado de Infinity Army. El parser reconoce unidades, grupos, armamento y costes CAP/puntos, e ignora título, totales y enlace.
- En Infinity Army se conservan texto fuente, número de línea, grupo y campos de armamento/coste. Se resuelve por nombre de perfil; cuando hay variantes del mismo nombre, se usan armamento y coste para elegir solo si la mejor coincidencia es inequívoca. Los perfiles sin candidato siguen necesitando selección manual.
- Las coincidencias resueltas se pueden añadir a una colección de fichas; se conservan los duplicados y grupos, y se pueden eliminar, reordenar o limpiar toda la colección con confirmación. La colección presenta atributos, habilidades/equipo y nombres de armamento, y permite abrir la ficha detallada del perfil.
- La revisión permite retirar las coincidencias ya resueltas sin añadirlas a la colección.
- Hay gestión local de proyectos/listas con creación, cambio, renombrado, eliminación confirmada y autosave versionado en `localStorage`. Cada proyecto conserva sus fichas, orden, identidad, duplicados y grupos; se recupera el proyecto activo al volver a abrir la app. El estado del guardado y los fallos son visibles, y un guardado inválido/incompatible no se sobrescribe sin confirmación. Los datos quedan ligados al navegador y al origen y pueden perderse al limpiar los datos del navegador; no hay sincronización ni copia de seguridad automática. Hay estilos de impresión para la colección, pero aún no hay controles de impresión/PDF, previsualización paginada ni validación de impresión.

### Deuda técnica y siguientes pasos

1. Probar el parser con más variantes reales de Infinity Army, en especial opciones de equipo, nombres no incluidos en el catálogo y cambios de formato del exportador. El enlace codificado y archivos exportados no se procesan.
2. **Siguiente paso funcional recomendado:** añadir exportación/importación de copias de seguridad de proyectos locales.
3. Implementar exportación PDF e impresión completa con selección de papel, control de saltos y pruebas en navegador/impresora.
4. Completar las fichas de colección con la tabla visual de perfiles de armas, ahora disponible en el detalle del perfil.
5. Incorporar imágenes permitidas y asociadas de forma fiable a unidad/perfil; actualmente se usa un marcador.
6. Desarrollar las explicaciones didácticas contextuales del modo de aprendizaje.
7. Añadir pruebas de interfaz en navegador para importación, resolución manual, colección, reordenación, responsive e impresión.
8. Modelar la clase de tropa (Infantería Ligera/Media/Pesada, etc.) como dato separado de `troopType`; completar cuando se decidan fuente y alcance de clasificación.
9. Mantener sectoriales desactivados hasta disponer de asignaciones respaldadas por fuentes.
10. Configurar y probar el despliegue estático en GitHub Pages; no está publicado todavía.

### Despliegue previsto: GitHub Pages

GitHub Pages es la opción inicial prevista por ser un alojamiento estático y gratuito para sitios de repositorios públicos. Encaja con el piloto actual: React/Vite, catálogos JSON locales y lógica que se ejecuta en el navegador. El despliegue no está configurado todavía.

**Consecuencias para la arquitectura y el uso:**

- Pages sirve HTML, CSS, JavaScript y recursos estáticos; no ejecuta un backend, base de datos, funciones de servidor ni tareas privadas. El catálogo y el código incluidos en el build son descargables por los visitantes. No incluir secretos ni datos que deban mantenerse privados.
- La persistencia inicial puede ser local en el navegador, pero no sincroniza proyectos entre dispositivos ni usuarios. `localStorage` pertenece al origen del sitio: localhost, el dominio `github.io` y un dominio personalizado son almacenamientos separados. Debe haber exportación/importación de copias de seguridad antes de depender de proyectos locales.
- Al ser un sitio de proyecto, la URL por defecto incluye el nombre del repositorio (`/<repo>/`). Vite debe compilar con el `base` correcto (actualmente no configurado) y los recursos/rutas deben probarse desde esa subruta, no solo desde la raíz local.
- GitHub Pages no proporciona fallback de servidor para rutas SPA. Si se añaden rutas, habrá que diseñar la navegación para hosting estático (por ejemplo, hash routing o una solución explícita de fallback) y probar recarga/enlaces directos.
- Los sitios publicados pueden tener hasta 1 GB; GitHub documenta límites suaves de 100 GB de transferencia mensual y 10 builds por hora (este último no aplica si se publica mediante un workflow personalizado de GitHub Actions). Los despliegues pueden expirar si tardan más de 10 minutos. Son límites holgados para el piloto, pero las imágenes pesadas y un aumento de uso deben vigilarse. Revisar la [documentación vigente de límites de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- GitHub registra las direcciones IP de quienes visitan Pages por razones de seguridad. No se debe presentar la app como anónima respecto al proveedor de hosting. Más información: [qué es GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

**Trabajo necesario para publicarla:**

1. Configurar `base` en Vite para el nombre real del repositorio y verificar que funcione en una ruta `/repo/`.
2. Añadir un workflow de GitHub Actions con permisos mínimos para compilar y publicar el directorio `dist`.
3. Habilitar GitHub Pages desde ese workflow en la configuración del repositorio.
4. Probar URL, carga de recursos, refresco, impresión y funcionamiento completo en el sitio publicado; dejar la URL de producción documentada.
5. Si se configura dominio personalizado, revisar DNS, HTTPS y el cambio de origen para los datos locales guardados.

Si en el futuro se requieren cuentas, sincronización entre dispositivos, listas compartidas o datos privados, GitHub Pages por sí solo no será suficiente: habrá que añadir un backend y alojamiento independiente, o elegir una plataforma que los proporcione.

## 1. Rol y objetivo

Actúa como un desarrollador senior especializado en React, TypeScript, diseño UX/UI, arquitectura frontend y aplicaciones de consulta de reglas para juegos de miniaturas.

Quiero desarrollar una aplicación web para **Infinity the Game de Corvus Belli**, cuyo objetivo principal sea convertir listas de ejército en fichas visuales claras, atractivas y fáciles de entender, inspiradas en la comodidad de las datacards de Warhammer 40,000, pero adaptadas a las reglas y necesidades específicas de Infinity.

La aplicación está dirigida tanto a jugadores experimentados como, especialmente, a personas que están aprendiendo a jugar.

El resultado debe ser una aplicación real, funcional, modular, responsive y fácil de mantener. No quiero únicamente una landing page, un prototipo estático ni una colección de componentes sin lógica.

## 2. Analiza primero el proyecto existente

Dispongo de un archivo HTML existente, «Ultima versión .html», que contiene una herramienta anterior de generación de hojas de ayuda para JSA.

**Alcance inicial acordado:** la primera versión trabajará exclusivamente con JSA para refinar la experiencia. La arquitectura debe permitir incorporar otras facciones y sectoriales después, pero la interfaz solo ofrecerá catálogos que realmente estén cargados y respaldados por datos. No muestres facciones futuras como opciones disponibles.

También existe la carpeta «1 N5 Versions (v4)», con láminas JPG de facciones, sectoriales y categorías especiales. Estas láminas son referencias visuales del catálogo: no equivalen a perfiles de reglas ni bastan por sí solas para asignar una unidad a un sectorial. Mantén separadas la facción, la pertenencia sectorial, la disponibilidad del perfil y su imagen; solo activa un filtro sectorial cuando su relación de perfiles esté respaldada por una fuente comprobable.

Antes de programar:

1. Analiza el archivo completo y documenta sus funcionalidades, su estructura de datos y sus limitaciones.
2. Identifica qué lógica merece la pena reutilizar conceptualmente y qué debe reconstruirse.
3. Examina especialmente la base de datos de unidades, los perfiles, las armas, las habilidades, las imágenes, la composición de fichas, la búsqueda y el almacenamiento de proyectos.
4. No des por correctos los datos de reglas del HTML por el mero hecho de estar incluidos.
5. No conviertas mecánicamente el HTML a JSX. Rediseña la aplicación pensando primero en la experiencia de usuario.
6. Conserva las funcionalidades útiles existentes, salvo que haya una razón justificada para sustituirlas.
7. Presenta un breve diagnóstico y una arquitectura propuesta antes de iniciar la implementación.
8. Usa JSA como único catálogo seleccionable en el piloto. Estructura los modelos para ampliar a otras facciones sin simular datos que todavía no existen.
9. En el piloto actual, utiliza los perfiles heredados de JSA para el flujo funcional por decisión del propietario, pero conserva su procedencia y estado de verificación; no declares que se han vuelto a cotejar. La clase de tropa y las relaciones sectoriales no deben inferirse si no hay datos respaldados.

No elimines datos ni funcionalidades sin identificar previamente qué se perdería.

## 3. Flujo de uso principal

El flujo principal debe ser extremadamente sencillo:

1. El usuario pega una lista de Infinity o importa un archivo compatible.
2. La aplicación analiza el contenido e identifica las unidades y sus perfiles.
3. Muestra una vista previa de las unidades reconocidas, incluyendo variantes, armas y opciones de equipo cuando corresponda.
4. El usuario puede corregir las coincidencias ambiguas.
5. La aplicación genera automáticamente una colección de fichas visuales.
6. El usuario puede reorganizar las fichas, personalizarlas, consultar explicaciones y exportar el resultado.

La experiencia debe minimizar la configuración manual.

No obligues al usuario a introducir de nuevo todos los atributos de una unidad que ya existe en la base de datos.

## 4. Importación y reconocimiento de listas

Diseña un sistema de importación extensible.

Debe contemplar:

- Pegar texto directamente.
- Importar formatos estructurados que se decidan soportar.
- Reconocer nombres de unidades, perfiles, variantes y opciones de equipo.
- Diferenciar una unidad de una entrada genérica o una referencia a un perfil.
- Reconocer sectoriales cuando sea posible.
- Conservar el nombre original de cada entrada importada.
- Mostrar advertencias cuando una entrada no pueda identificarse con seguridad.
- Permitir seleccionar manualmente la coincidencia correcta.
- Evitar asignar silenciosamente un perfil incorrecto.

Si un formato de exportación oficial o externo no está documentado, no inventes su estructura: implementa un adaptador cuando se haya confirmado el formato real.

El sistema de importación debe estar separado de la interfaz y de la base de datos.

## 5. Diseño de las datacards

Esta es la funcionalidad más importante.

Cada unidad debe disponer de una ficha visual que presente sus datos de forma legible, jerárquica y consistente.

### Cabecera

Mostrar:

- Nombre de la unidad.
- Facción y sectorial, cuando corresponda.
- Imagen identificativa.
- Tipo de tropa o clasificación relevante.
- Coste en puntos.
- CAP cuando corresponda.
- Información adicional relevante para identificar correctamente el perfil.

### Atributos

Presentar los atributos del perfil de forma clara, con etiquetas comprensibles y abreviaturas oficiales reconocibles.

Los atributos y su significado deben proceder de los datos reales de Infinity, no de valores inventados por la interfaz.

En particular, distingue correctamente los atributos de la tropa de los valores que pertenecen a armas, habilidades o equipamiento.

### Habilidades y equipamiento

Mostrar las habilidades especiales, las reglas de equipo y los elementos relevantes para utilizar la unidad.

Cada habilidad debe poder abrir una explicación contextual en lenguaje sencillo.

Diferencia claramente:

- Nombre oficial de la habilidad.
- Resumen breve para consulta rápida.
- Explicación ampliada.
- Fuente y versión de la regla, cuando estén disponibles.

No conviertas una explicación simplificada en una regla alternativa.

### Armamento

El armamento debe tener un tratamiento visual específico.

Mostrar las armas y los valores que correspondan al perfil y al tipo de arma, incluyendo las características relevantes para su utilización.

No fuerces todas las armas a compartir una tabla simplificada si sus perfiles utilizan campos diferentes.

Las armas con varios modos, plantillas, municiones o reglas particulares deben conservar la información necesaria para interpretarlas correctamente.

### Legibilidad

Prioriza:

- Tipografía legible.
- Buen contraste.
- Jerarquía visual clara.
- Abreviaturas acompañadas de ayudas contextuales.
- Distribución consistente entre unidades.
- Diseño adaptable a diferentes tamaños de pantalla.
- Una versión compacta y otra ampliada de las fichas.

La ficha debe servir durante una partida real, no solamente en una captura de pantalla.

## 6. Imágenes de las miniaturas

Cada unidad debe poder mostrar una imagen que facilite su reconocimiento visual.

Diseña un sistema de imágenes que admita:

- Imagen oficial, cuando esté disponible y su utilización esté permitida.
- Imagen local añadida por el usuario.
- Imagen personalizada asociada a una unidad o perfil.
- Imagen alternativa o silueta cuando no exista una imagen disponible.
- Sustitución manual de imágenes incorrectas.
- Caché y optimización de imágenes.

La imagen debe corresponder a la unidad adecuada, no simplemente a una miniatura parecida de la misma facción.

No inventes URLs, no dependas de enlaces frágiles ni presupongas que todas las imágenes de la tienda oficial se pueden reutilizar libremente. Documenta las fuentes y sus condiciones de uso.

La falta de una imagen no debe impedir generar la ficha.

## 7. Base de datos y fiabilidad de las reglas

La arquitectura debe separar completamente los datos del juego, la lógica de procesamiento y los componentes visuales.

Diseña modelos tipados para representar, como mínimo:

- Facciones.
- Sectoriales.
- Unidades.
- Perfiles.
- Atributos.
- Armamento.
- Habilidades.
- Equipamiento.
- Reglas y referencias.
- Imágenes.
- Listas importadas.
- Fichas generadas.

Ten en cuenta que una misma unidad puede disponer de múltiples perfiles, configuraciones de armas y opciones de equipo.

Cada perfil debe tener una identidad inequívoca. No identifiques una unidad únicamente por su nombre visible.

### Reglas de integridad

- No inventar atributos, perfiles, habilidades, armamento ni costes.
- No mezclar datos de distintas ediciones de Infinity.
- No mezclar indiscriminadamente reglas de N4 y N5.
- Registrar la edición y la versión de los datos.
- Distinguir datos verificados, datos pendientes de verificar y datos ausentes.
- Mantener trazabilidad hacia las fuentes cuando sea posible.
- Validar los datos importados.
- Mostrar errores comprensibles cuando un perfil esté incompleto.

La base de datos inicial puede comenzar con un conjunto reducido de unidades verificadas. Es preferible tener datos correctos y trazables que una base de datos enorme con errores.

No supongas que se dispone de una API oficial pública. Investiga las fuentes realmente disponibles y documenta las limitaciones de acceso y actualización.

## 8. Modo de aprendizaje para nuevos jugadores

La aplicación debe ayudar a entender las fichas sin abrumar al usuario.

Incorpora un modo de aprendizaje que permita:

- Explicar los atributos mediante textos breves.
- Mostrar qué significa una abreviatura al pulsarla o pasar el cursor.
- Explicar habilidades y equipo en lenguaje sencillo.
- Diferenciar información esencial de información avanzada.
- Consultar reglas ampliadas sin abandonar la ficha.
- Mostrar ejemplos de uso cuando estén respaldados por las reglas correspondientes.

No muestres todas las explicaciones ampliadas permanentemente. La vista normal debe seguir siendo compacta.

La explicación didáctica debe respetar la mecánica oficial. Si una regla depende de condiciones o excepciones, deben indicarse.

## 9. Organización y personalización

Permite que el usuario:

- Cree proyectos o listas.
- Cambie el nombre de un proyecto.
- Guarde y recupere proyectos.
- Añada, elimine y reorganice fichas.
- Duplique fichas cuando sea útil.
- Cambie el tamaño y la densidad de las fichas.
- Seleccione una plantilla visual.
- Configure el número de fichas por página.
- Personalice títulos, subtítulos y notas.
- Oculte información secundaria en el modo compacto.
- Mantenga las imágenes y personalizaciones asociadas a cada proyecto.

El guardado debe ser fiable y no depender exclusivamente de que la pestaña permanezca abierta.

Si se utiliza almacenamiento local, documenta sus límites e incorpora exportación e importación de copias de seguridad.

## 10. Exportación

Prioriza los siguientes formatos:

1. PDF listo para imprimir.
2. Vista de impresión con tamaños de página configurables.
3. Vista digital para consultar desde ordenador, tablet o móvil.
4. Exportación e importación de proyectos en un formato estructurado documentado.

Las fichas impresas deben conservar una tipografía legible y evitar cortes de contenido.

Antes de exportar, ofrece una vista previa.

No reduzcas automáticamente el tamaño del texto hasta hacerlo ilegible para conseguir que todo quepa en una página.

## 11. UX/UI y dirección visual

Quiero una aplicación moderna, limpia y funcional, con una estética tecnológica inspirada en Infinity, pero sin sacrificar la legibilidad.

La interfaz debe transmitir que es una herramienta de juego, no un panel administrativo genérico.

Características deseadas:

- Interfaz en español.
- Terminología oficial de Infinity conservada cuando corresponda.
- Diseño responsive.
- Componentes visuales consistentes.
- Búsqueda rápida.
- Filtros por facción, sectorial y tipo de unidad.
- Estados de carga, errores y ausencia de resultados bien diseñados.
- Navegación intuitiva.
- Accesibilidad básica mediante teclado, etiquetas y contraste adecuado.

Evita saturar las fichas con bordes, degradados, iconos decorativos o texto diminuto.

La prioridad visual es: identificar la unidad, leer sus atributos, consultar su armamento y entender sus reglas.

## 12. Tecnología y arquitectura

Utiliza:

- React.
- TypeScript.
- Vite, salvo que el análisis del proyecto justifique otra alternativa.
- Componentes funcionales y hooks.
- Un sistema de estilos mantenible.
- Validación de datos en los límites de importación.
- Pruebas automatizadas para la lógica crítica.

Propón una estructura modular con separación entre:

- Interfaz y componentes.
- Modelos de datos.
- Base de datos y fuentes.
- Importadores y parsers.
- Lógica de resolución de unidades.
- Generación de fichas.
- Persistencia de proyectos.
- Exportación e impresión.
- Tests.

No introduzcas dependencias innecesarias. Justifica las librerías que resulten esenciales.

La primera versión puede ser frontend y utilizar datos locales si eso permite validar la experiencia sin montar prematuramente un backend.

No añadas autenticación, cuentas de usuario ni infraestructura de servidor salvo que exista una necesidad concreta.

## 13. Calidad y pruebas

Implementa pruebas para verificar:

- El reconocimiento de unidades a partir de listas.
- Las coincidencias ambiguas.
- La selección del perfil correcto.
- La representación de atributos y armamento.
- La ausencia de imágenes.
- Los datos incompletos.
- La conservación de proyectos al guardar y cargar.
- La exportación y la impresión.
- La visualización responsive.

Añade datos de prueba realistas y claramente identificados como ejemplos cuando no estén verificados.

No declares que una función está terminada simplemente porque el componente se renderiza.

## 14. Fases de desarrollo

Trabaja por fases, con entregables comprobables.

**Fase 1 — Auditoría y arquitectura**
- Analizar el HTML existente.
- Identificar datos, funcionalidades y deuda técnica.
- Proponer arquitectura y modelo de datos.
- Identificar riesgos de fuentes, imágenes y reglas.

**Fase 2 — MVP funcional**
- Crear el proyecto React.
- Implementar el catálogo piloto de JSA y la selección de sus perfiles.
- Habilitar sectoriales únicamente cuando se disponga de una relación de perfiles verificada.
- Implementar importación de texto pegado, con soporte de texto de Infinity Army, grupos de combate, advertencias y resolución manual de coincidencias ambiguas o no encontradas.
- Utilizar el catálogo JSA heredado en el flujo MVP; mantener su procedencia y su estado `unverified` explícitos. El cotejo de valores y la clasificación LI/MI/HI quedan fuera del alcance funcional de esta fase.
- Mostrar las unidades en fichas visuales con imágenes o sustitutos.
- Incorporar búsqueda, adición, eliminación, reordenación y vista previa de la colección.

**Fase 3 — Gestión y exportación**
- Guardado de proyectos.
- Reorganización de fichas.
- Plantillas.
- Exportación a PDF e impresión.

**Fase 4 — Modo de aprendizaje**
- Explicaciones contextuales.
- Ayudas sobre atributos, armas y habilidades.
- Vista compacta y ampliada.

**Fase 5 — Ampliación**
- Más facciones y perfiles.
- Más formatos de importación.
- Mejoras de personalización y accesibilidad.

**Fase 6 — Publicación**
- Configurar Vite y GitHub Actions para publicar en GitHub Pages.
- Validar el sitio servido bajo la subruta del repositorio y documentar sus límites.
- Confirmar que la persistencia local y las copias de seguridad explican el alcance de almacenamiento del navegador.

Al terminar cada fase, ejecuta las pruebas pertinentes, corrige los problemas detectados y documenta qué funciona y qué queda pendiente.

## 15. Forma de trabajar

No te limites a explicarme cómo lo harías: implementa la aplicación en el entorno de trabajo disponible.

Antes de tomar decisiones importantes, revisa el código existente y comprueba qué datos y funcionalidades están realmente presentes.

No inventes información de Infinity para rellenar huecos.

No sustituyas una función que ya existe por un botón decorativo.

No afirmes que una integración, fuente de datos o exportación funciona sin haberla probado.

Cuando falte información, elige una solución provisional segura, documenta la decisión y continúa con las partes que sí puedan implementarse.

Prioriza un MVP completo y útil sobre una gran cantidad de funcionalidades a medio terminar.

Al finalizar cada fase, proporciona:
- Qué se ha implementado.
- Qué archivos se han creado o modificado.
- Qué pruebas se han ejecutado y sus resultados.
- Qué limitaciones siguen pendientes.
- Cómo ejecutar la aplicación.

**Resultado esperado:** una aplicación React que convierta listas de Infinity en fichas visuales, legibles, fiables y didácticas, de manera que un jugador experimentado pueda consultar su ejército rápidamente y un principiante pueda aprender a utilizarlo sin tener que interpretar una hoja de perfiles poco accesible.