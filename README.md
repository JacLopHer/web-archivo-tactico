# Infinity Datacards

Aplicación web en React y TypeScript para consultar perfiles y preparar tarjetas de Infinity. El piloto actual se centra exclusivamente en JSA.

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

Los perfiles de tropas JSA y las referencias se migraron desde una herramienta local heredada y siguen **sin verificar**. Los perfiles de armas viven por separado en `src/data/weaponProfiles.json` para que otras facciones puedan reutilizarlos sin duplicar sus datos. Cada perfil conserva su fuente y estado de verificación.

Se han contrastado 176 perfiles con las páginas impresas 183–196 de la tabla de armas del PDF N5 actualización 5.3; los 55 restantes continúan pendientes. La revisión se realiza página a página, cotejando perfiles existentes y detectando armas que falten en el catálogo. Los modificadores negros de alcance se guardan como `--` y se muestran sin texto. Los perfiles de minas conservan las notas de despliegue y alias históricos del catálogo. Los nombres de armas sin coincidencia exacta se mantienen visibles, pero no reciben valores inferidos. La asignación de perfiles de tropas a sectoriales permanece desactivada hasta poder verificarla.

Para regenerar los perfiles de tropas y la copia heredada de perfiles de armas desde el HTML local (no incluido en el repositorio, debe estar disponible en la raíz):

```powershell
npm run migrate:legacy
```

La migración conserva el estado y la fuente de perfiles de armas sin cambios, identificados por su ID estable. El HTML de origen, los PDF y las láminas de referencia de facciones son material local y están excluidos de este repositorio.
