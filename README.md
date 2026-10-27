# Infinity Datacards

Aplicación web en React y TypeScript para consultar perfiles y preparar tarjetas de Infinity. El piloto actual se centra exclusivamente en JSA.

## Flujo MVP

1. Pega una lista de perfiles JSA en el cuadro de importación, con un perfil por línea.
2. Analiza la lista. Solo se resuelven automáticamente nombres completos coincidentes con el catálogo (ignorando mayúsculas, acentos y puntuación).
3. Selecciona manualmente un perfil para cada nombre ambiguo o no reconocido. Las coincidencias parciales no se asignan automáticamente.
4. Añade los perfiles resueltos a la colección. También puedes añadir perfiles desde el catálogo, abrir su ficha detallada, reordenar o quitar fichas.

La importación todavía no interpreta cabeceras, cantidades, grupos de combate ni archivos de Infinity Army u otros formatos. La colección solo vive en memoria y se pierde al recargar la página. La tabla detallada de armas está disponible al seleccionar una ficha en el catálogo; las tarjetas de colección muestran atributos, habilidades/equipo y nombres de armamento.

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

Los perfiles de tropas JSA y las referencias se migraron desde una herramienta local heredada. Por decisión del propietario, se aceptan como conjunto de datos para el MVP sin realizar un cotejo adicional; el catálogo conserva `unverified` como estado de trazabilidad de la fuente, no como bloqueo de uso funcional. Los perfiles de armas viven por separado en `src/data/weaponProfiles.json` para que otras facciones puedan reutilizarlos sin duplicar sus datos. Cada perfil conserva su fuente y estado de verificación.

Se han contrastado directamente 176 perfiles con las páginas impresas 183–196 de la tabla de armas del PDF N5 actualización 5.3. Además, el usuario confirmó 13 variantes `(+1R)`, 23 variantes de Arma CC con distintos PS, Mk12(AP) y Pulso Flash(PS=6). También confirmó los diez registros genéricos cuyos modos tienen perfiles separados, verificados directamente con el PDF. Las tres variantes de Torreta Artillada usan el perfil del arma indicada entre paréntesis, conforme a la regla [Armed Turret](https://infinitythewiki.com/Armed_Turret), y sus valores coinciden con Fusil Combi o Fusil AP. En total, los 227 perfiles de arma están verificados; 176 tienen fuente directa del PDF y los demás registran la validación del usuario o la regla Wiki aplicable. ECM: Hacker [-6] y Cobertura Desplegable son equipo automático, mientras que KOBARUTO y TURTLEMEK son periféricos REM; ninguno se incluye en el catálogo de armas. El cotejo página a página detectó también perfiles ausentes que se añadieron al catálogo. Los modificadores negros de alcance se guardan como `--` y se muestran sin texto; la paleta de modificadores sigue la referencia visual compartida. Los perfiles de minas conservan las notas de despliegue y alias históricos del catálogo. La asignación de perfiles de tropas a sectoriales permanece desactivada hasta poder verificarla.

Para regenerar los perfiles de tropas y la copia heredada de perfiles de armas desde el HTML local (no incluido en el repositorio, debe estar disponible en la raíz):

```powershell
npm run migrate:legacy
```

La migración conserva el estado y la fuente de perfiles de armas sin cambios, identificados por su ID estable. El HTML de origen, los PDF y las láminas de referencia de facciones son material local y están excluidos de este repositorio.
