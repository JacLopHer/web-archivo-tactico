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

El catálogo JSA inicial se migró desde una herramienta local heredada. Sus perfiles, armas y referencias están marcados como **sin verificar** y no deben tratarse como una fuente oficial de reglas. La asignación de perfiles a sectoriales permanece desactivada hasta poder verificarla.

La ficha muestra los perfiles de armamento heredados con modificadores de alcance, PS, R, munición, atributo y número de tiradas de salvación, además de sus propiedades. Los nombres sin coincidencia exacta se mantienen visibles, pero no reciben valores inferidos.

Para regenerar el catálogo desde el HTML local (no incluido en el repositorio, debe estar disponible en la raíz):

```powershell
npm run migrate:legacy
```

El HTML de origen, el PDF de ayuda y las láminas de referencia de facciones son material local y están excluidos de este repositorio.
