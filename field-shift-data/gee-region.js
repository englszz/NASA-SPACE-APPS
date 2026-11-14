// FIELD SHIFT - Datos satelitales de la región (Google Earth Engine)
// Pegar en code.earthengine.google.com y pulsar Run.
//  - En la CONSOLA sale el suelo: copia esa línea y guárdala como soil.json
//  - En la pestaña TASKS pulsa RUN en "fieldshift_gee": el CSV llega a tu Drive.
//    Guárdalo como fieldshift_gee.csv junto a build-data.mjs.
// Columnas: year, month, ndvi (MODIS), et_modis (mm/mes, MODIS MOD16),
//           smap_rz (humedad radicular SMAP L4, m3/m3), grace (cm, agua total)

var REGION_ID = 'cibao';
var CENTER = ee.Geometry.Point([-70.50, 19.25]);
var AREA = CENTER.buffer(5000);          // 5 km alrededor del punto
var START = 2006, END = 2025;

Map.centerObject(AREA, 10);
Map.addLayer(AREA, {color: 'red'}, 'Región Field Shift');

// ---------- SUELO (SoilGrids, promedio 0-30 cm) ----------
function topsoil(asset, prop) {
  var img = ee.Image(asset);
  return img.select(prop + '_0-5cm_mean').multiply(5)
    .add(img.select(prop + '_5-15cm_mean').multiply(10))
    .add(img.select(prop + '_15-30cm_mean').multiply(15))
    .divide(30).divide(10).rename(prop);
}
var soil = topsoil('projects/soilgrids-isric/sand_mean', 'sand')
  .addBands(topsoil('projects/soilgrids-isric/clay_mean', 'clay'))
  .addBands(topsoil('projects/soilgrids-isric/silt_mean', 'silt'))
  .addBands(topsoil('projects/soilgrids-isric/phh2o_mean', 'phh2o'))
  .addBands(topsoil('projects/soilgrids-isric/soc_mean', 'soc'));
soil.reduceRegion({reducer: ee.Reducer.mean(), geometry: AREA, scale: 250}).evaluate(function (s) {
  print('COPIA ESTO EN soil.json:');
  print(JSON.stringify({id: REGION_ID, sand: s.sand, clay: s.clay, silt: s.silt, ph: s.phh2o, soc: s.soc}));
});

// ---------- COLECCIONES ----------
var ndviCol = ee.ImageCollection('MODIS/061/MOD13Q1').select('NDVI');            // 250 m, 16 días, x0.0001
var etCol = ee.ImageCollection('MODIS/061/MOD16A2GF').select('ET');              // 500 m, 8 días, kg/m2/8d x0.1
var smapCol = ee.ImageCollection('NASA/SMAP/SPL4SMGP/008').select('sm_rootzone'); // 9 km, 3 h, desde 2015
var graceCol = ee.ImageCollection('NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI').select('lwe_thickness'); // ~50 km, mensual
var imergCol = ee.ImageCollection('NASA/GPM_L3/IMERG_MONTHLY_V07').select('precipitation');      // ~10 km, mensual, mm/h

function meanIn(col, start, end, band) {
  var img = col.filterDate(start, end).mean();
  return ee.Algorithms.If(col.filterDate(start, end).size().gt(0),
    img.reduceRegion({reducer: ee.Reducer.mean(), geometry: AREA, scale: 500, bestEffort: true}).get(band), null);
}
function sumIn(col, start, end, band) {
  var img = col.filterDate(start, end).sum();
  return ee.Algorithms.If(col.filterDate(start, end).size().gt(0),
    img.reduceRegion({reducer: ee.Reducer.mean(), geometry: AREA, scale: 500, bestEffort: true}).get(band), null);
}

var months = [];
for (var y = START; y <= END; y++) for (var m = 1; m <= 12; m++) months.push([y, m]);

var fc = ee.FeatureCollection(months.map(function (ym) {
  var start = ee.Date.fromYMD(ym[0], ym[1], 1);
  var end = start.advance(1, 'month');
  var ndvi = meanIn(ndviCol, start, end, 'NDVI');
  var et = sumIn(etCol, start, end, 'ET');
  return ee.Feature(null, {
    year: ym[0], month: ym[1],
    ndvi: ee.Algorithms.If(ndvi, ee.Number(ndvi).multiply(0.0001), null),
    et_modis: ee.Algorithms.If(et, ee.Number(et).multiply(0.1), null),
    smap_rz: meanIn(smapCol, start, end, 'sm_rootzone'),
    grace: meanIn(graceCol, start, end, 'lwe_thickness'),
    imerg_mm: ee.Algorithms.If(imergCol.filterDate(start, end).size().gt(0),
      ee.Number(meanIn(imergCol, start, end, 'precipitation')).multiply(end.difference(start, 'hour')), null)
  });
}));

print('Vista previa (primeros 3 meses):', fc.limit(3));

Export.table.toDrive({
  collection: fc,
  description: 'fieldshift_gee',
  fileFormat: 'CSV',
  selectors: ['year', 'month', 'ndvi', 'et_modis', 'smap_rz', 'grace']
});
