// FIELD SHIFT - Proyección climática NASA NEX-GDDP-CMIP6
// Cambio mensual esperado (2041-2060, escenario SSP2-4.5) vs. referencia (1995-2014).
// Pegar en code.earthengine.google.com, pulsar Run, luego en la pestaña
// "Tasks" pulsar RUN en "fieldshift_cmip6". El CSV llega a tu Google Drive.
// Descárgalo y guárdalo como fieldshift_cmip6.csv junto a build-data.mjs.

var regions = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-70.50, 19.25]), {id: 'cibao'}),
  ee.Feature(ee.Geometry.Point([-60.57, -33.89]), {id: 'pampa'}),
  ee.Feature(ee.Geometry.Point([-5.10, 37.55]), {id: 'andalucia'}),
  ee.Feature(ee.Geometry.Point([35.27, 0.52]), {id: 'eldoret'}),
  ee.Feature(ee.Geometry.Point([75.85, 30.90]), {id: 'punjab'}),
  ee.Feature(ee.Geometry.Point([147.37, -35.12]), {id: 'riverina'})
]);

// Ensamble de 5 modelos (más rápido que usar los 35)
var MODELS = ['ACCESS-CM2', 'MIROC6', 'MPI-ESM1-2-LR', 'NorESM2-LM', 'GFDL-ESM4'];
var col = ee.ImageCollection('NASA/GDDP-CMIP6')
  .filter(ee.Filter.inList('model', MODELS))
  .select(['tas', 'pr']);

// Comprobación rápida: debe imprimir un número mayor que 0
print('Imágenes futuras encontradas:',
  col.filter(ee.Filter.eq('scenario', 'ssp245')).filterDate('2041-01-01', '2041-02-01').size());

function monthMean(scenario, y0, y1, m) {
  return col.filter(ee.Filter.eq('scenario', scenario))
    .filter(ee.Filter.calendarRange(y0, y1, 'year'))
    .filter(ee.Filter.calendarRange(m, m, 'month'))
    .mean();
}

var tables = [];
for (var m = 1; m <= 12; m++) {
  var hist = monthMean('historical', 1995, 2014, m);
  var fut = monthMean('ssp245', 2041, 2060, m);
  var delta = fut.select('tas').subtract(hist.select('tas')).rename('dT')   // °C (K - K)
    .addBands(fut.select('pr').divide(hist.select('pr')).rename('pRatio')); // cambio relativo de lluvia
  tables.push(delta.reduceRegions({collection: regions, reducer: ee.Reducer.mean(), scale: 27830})
    .map((function (month) { return function (f) { return f.set('month', month); }; })(m)));
}

var out = ee.FeatureCollection(tables).flatten();

Export.table.toDrive({
  collection: out,
  description: 'fieldshift_cmip6',
  fileFormat: 'CSV',
  selectors: ['id', 'month', 'dT', 'pRatio']
});
