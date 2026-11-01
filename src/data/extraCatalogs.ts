import type { ExtraFactionsCatalog } from '../types/catalog';

type CatalogModule = { default: unknown };

// Cada ejército es un archivo JSON propio: Vite lo separa en un chunk que se carga en paralelo al arrancar.
const armyModules = import.meta.glob<CatalogModule>('./armies/*.json');
const loaders: Record<string, () => Promise<CatalogModule>> = {
  ...Object.fromEntries(Object.entries(armyModules).map(([path, load]) => [path.replace(/^.*\/|\.json$/g, ''), load])),
  'nomads-aleph': () => import('./nomadsAlephCatalog.json'),
};
const catalogOrder = ['panoceania', 'yu-jing', 'ariadna', 'haqqislam', 'nomads-aleph', 'combined-army', 'tohaa', 'o-12', 'non-aligned'];
const missingOrder = Object.keys(loaders).filter((key) => !catalogOrder.includes(key));
if (missingOrder.length) throw new Error(`Catálogos sin orden definido: ${missingOrder.join(', ')}`);

const catalogs = await Promise.all(
  catalogOrder.filter((key) => key in loaders)
    .map(async (key) => (await loaders[key]()).default as ExtraFactionsCatalog),
);

const weaponsById = new Map(catalogs.flatMap((catalog) => catalog.weapons ?? []).map((weapon) => [weapon.id, weapon]));
const troopClassGroups = new Map<string, string[]>();
for (const group of catalogs.flatMap((catalog) => catalog.troopClassGroups)) {
  troopClassGroups.set(group.troopClass, [...(troopClassGroups.get(group.troopClass) ?? []), ...group.unitIds]);
}

export const extraFactionsCatalog: ExtraFactionsCatalog = {
  schemaVersion: 1,
  factions: catalogs.flatMap((catalog) => catalog.factions),
  metadata: catalogs[0].metadata,
  sectorials: catalogs.flatMap((catalog) => catalog.sectorials),
  troopClassGroups: [...troopClassGroups].map(([troopClass, unitIds]) => ({
    troopClass: troopClass as ExtraFactionsCatalog['troopClassGroups'][number]['troopClass'],
    unitIds,
  })),
  units: catalogs.flatMap((catalog) => catalog.units),
  weapons: [...weaponsById.values()],
};
