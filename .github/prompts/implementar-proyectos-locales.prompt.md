---
name: "Implementar proyectos y guardado local"
description: "Permite crear, guardar automáticamente, recuperar y gestionar listas JSA en el navegador"
argument-hint: "Indica si quieres limitar el trabajo a una parte concreta de la gestión de proyectos"
agent: "agent"
---

Continúa el desarrollo de Infinity Datacards en este repositorio. Implementa persistencia local y gestión básica de proyectos para que las colecciones de fichas no se pierdan al recargar la aplicación.

## Contexto y estado conocido

- La aplicación es React + TypeScript + Vite, piloto de Infinity N5 para JSA.
- El importador admite listas pegadas y texto copiado de Infinity Army; reconoce perfiles, grupos de combate, armamento y costes, y mantiene repeticiones. La selección ambigua/no encontrada se puede resolver manualmente.
- La colección actual en `src/App.tsx` vive en estado React: tarjetas `{ id, profileId, groupName? }`. Se pueden añadir, quitar, reordenar y limpiar.
- La colección es volátil; recargar la página la borra. La documentación identifica guardado/recuperación como el siguiente paso funcional.
- Los perfiles de tropa heredados continúan con estado `unverified`; no realices su cotejo en esta tarea. No actives sectoriales ni alteres las fuentes de datos.
- El destino previsto es GitHub Pages: solo hosting estático. El almacenamiento local queda ligado al navegador y al origen web; no sincroniza entre dispositivos ni usuarios.
- Comprueba el estado real de la rama y del árbol de trabajo antes de editar. El prompt anterior de validación sectorial bajo `.github/prompts/` puede ser un archivo local sin seguimiento: no lo sobrescribas, elimines ni incluyas por accidente.

## Alcance funcional

Implementa una gestión sencilla de varias listas/proyectos:

1. Crear un proyecto/lista y asignarle un nombre.
2. Guardar automáticamente su nombre y colección cuando cambien, y restaurarlos al abrir/recargar la app.
3. Cambiar entre proyectos y mostrar claramente cuál está activo.
4. Renombrar y eliminar proyectos con confirmación cuando la acción pueda perder datos.
5. Mantener el proyecto actual usable si el almacenamiento está vacío en una instalación nueva.
6. Conservar en cada tarjeta su identidad, perfil, orden y grupo de combate. Mantener duplicados válidos.
7. El cambio entre proyectos no debe mezclar ni borrar silenciosamente las fichas del proyecto anterior.
8. Dar feedback visible de guardado y mostrar errores de almacenamiento; no afirmar que se guardó si la escritura falló.

Elige y documenta un comportamiento claro al arrancar sin proyectos. Como opción recomendada, crear una lista inicial con un nombre por defecto y persistirla en el primer cambio. Evita guardar el estado inicial vacío sobre datos existentes antes de terminar la carga.

## Diseño técnico

- Inspecciona primero `src/App.tsx`, tipos, CSS, tests, `package.json`, README y el bloque de estado/deuda técnica de `techplan.md`.
- Aísla el modelo y las operaciones de persistencia del JSX; reutiliza las convenciones del proyecto y evita dependencias nuevas salvo necesidad demostrada.
- Añade un esquema versionado y validación del contenido leído desde `localStorage`. Datos malformados, versiones incompatibles o errores de acceso/escritura deben exponerse al usuario y no producir fallbacks que parezcan guardados correctamente.
- Evita efectos que sobrescriban el almacenamiento antes de hidratar el estado. Comprueba los estados de carga, creación, cambio de proyecto y autosave.
- Mantén la persistencia limitada a la colección/proyecto. No persistas filtros, selección temporal del catálogo ni texto/resolución temporal de una importación salvo que sea necesario y lo justifiques.
- Las operaciones de renombrar y eliminar deben ser accesibles por teclado y mantener las confirmaciones con el estilo existente.
- Documenta que los datos son locales al navegador/origen, no sincronizados y pueden borrarse al limpiar los datos del navegador. La importación/exportación de copias de seguridad queda para una tarea posterior.

## Pruebas y validación

Añade pruebas automatizadas para, como mínimo:

- Crear/serializar/leer proyectos y conservar orden, duplicados y grupos.
- Renombrar y eliminar un proyecto sin afectar los restantes.
- Manejar almacenamiento vacío, JSON inválido y errores de escritura.
- No pisar datos guardados durante la hidratación inicial.
- Verificar que cambiar de proyecto carga la colección correcta y que las modificaciones autosalvadas sobreviven a recargar.

Ejecuta `npm test`, `npm run build` y, si el entorno lo permite, prueba el flujo en navegador. No instales dependencias salvo que un comando de validación demuestre que faltan.

## Documentación y límites

- Actualiza README y `techplan.md`: marcar persistencia y gestión implementadas, describir limitaciones de almacenamiento local y dejar copia de seguridad, imágenes, tabla de armas en las tarjetas, modo de aprendizaje, verificación de perfiles, clase de tropa, sectoriales y despliegue de Pages en su estado real.
- No afirmes que hay sincronización o respaldo automático fuera del navegador.
- No implementes en esta tarea exportación/importación de copias de seguridad, autenticación, backend, PDF, otras facciones ni clasificación LI/MI/HI.
- No hagas commit ni push salvo que el usuario lo solicite.

Al comenzar, informa brevemente del estado real de la rama/árbol y de los puntos de integración hallados. Implementa el flujo completo, valida errores y estados límite, y al terminar resume comportamiento, archivos, pruebas y deuda pendiente.
