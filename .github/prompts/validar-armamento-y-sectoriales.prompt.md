---
name: "Validar armamento y sectoriales JSA"
description: "Audita y conecta los perfiles de armas con tropas y sectoriales JSA usando fuentes verificables"
argument-hint: "Indica una unidad, sectorial o lote concreto si quieres limitar la revisión"
agent: "agent"
---

Continúa el trabajo de Infinity Datacards en este repositorio. El objetivo es validar cómo se relacionan el armamento y la disponibilidad sectorial con los perfiles de tropa JSA, y después reflejar únicamente las relaciones respaldadas por fuentes en la aplicación.

## Estado conocido

- El piloto actual cubre JSA para N5; no presentes el catálogo como si incluyera todas las facciones o todos los perfiles de Infinity.
- `src/data/weaponProfiles.json` contiene 227 perfiles de armas verificados. No reabras esa verificación ni cambies esos perfiles salvo que una discrepancia concreta en una asignación lo requiera.
- Los perfiles de tropa de `src/data/legacyJsaCatalog.json` proceden del HTML heredado y siguen sin verificar.
- La pertenencia sectorial todavía no está validada: `sectorials[].profileIds` y `profiles[].sectorialIds` están vacíos, y los sectoriales están marcados como `unmapped`. La interfaz los mantiene desactivados deliberadamente.
- La aplicación ya muestra el equipo de cada perfil y busca perfiles de arma mediante nombres y alias. Conserva explícitos los casos no encontrados; no asignes silenciosamente una coincidencia dudosa.
- El último estado conocido estaba en `main`, commit `e9b7950` (`feat: finalize weapon profile verification`). Comprueba el estado real de la rama y del árbol de trabajo antes de actuar.

## Procedimiento

1. Inspecciona primero los modelos, la interfaz, las pruebas, el HTML heredado y los materiales de referencia locales disponibles. Comprueba también las instrucciones del proyecto y las convenciones existentes.
2. Separa dos preguntas y no las confundas:
   - **Armamento de la tropa:** qué armas, equipo y variantes pertenecen a cada perfil.
   - **Disponibilidad sectorial:** en qué sectoriales está disponible cada perfil.
3. Contrasta los datos de tropa con fuentes primarias y de la edición correcta. Usa las láminas de sectoriales solo como referencias de catálogo; por sí solas no prueban disponibilidad ni reglas. No infieras una asignación únicamente por el nombre, por una imagen o por la presencia de una unidad en el HTML.
4. Lleva un registro de cada relación revisada con su fuente concreta y resultado: validada, discrepante, ambigua o pendiente. Si no puedes respaldarla, consérvala como no verificada y explica qué evidencia falta.
5. Revisa las asignaciones en lotes manejables. Informa del lote y de sus evidencias antes de propagar cambios masivos; no marques un perfil o sectorial como verificado por aproximación.
6. Implementa los cambios de datos y de interfaz necesarios para que las relaciones verificadas se utilicen correctamente. Conserva la distinción entre armas y otros equipos, y evita modificar perfiles de arma ya verificados como efecto colateral.
7. Añade o actualiza pruebas para las relaciones verificadas, los casos ambiguos y el comportamiento de los sectoriales aún sin mapear. Mantén las opciones no verificadas deshabilitadas o explícitamente pendientes.
8. Ejecuta las pruebas y la compilación existentes. Resume qué se verificó, qué cambió, qué queda pendiente y las fuentes utilizadas. No hagas commit ni push salvo que el usuario lo solicite.

Empieza informando del estado real del repositorio y proponiendo el primer lote concreto que vas a validar. Después avanza con ese lote usando las fuentes disponibles; pide una decisión solo cuando exista una ambigüedad que no pueda resolverse con evidencia.
