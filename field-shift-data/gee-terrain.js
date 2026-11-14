// FIELD SHIFT - Relieve de los puntos del Cibao (NASA SRTM, 30 m)
// Pegar en code.earthengine.google.com y pulsar Run.
// Luego, en la pestaña "Tasks", pulsar RUN en fieldshift_grid_terrain.
// El CSV aparece en tu Google Drive: cópialo a esta carpeta (field-shift-data/)
// y corre:  node build-grid.mjs
//
// Salida: id, slope_mean (pendiente media, %), slope_p90 (pendiente del 10 % más inclinado, %)

// Mismos puntos que fieldshift_grid_soil.csv
var coords = [[-70.4,19.15],[-70.3,19.15],[-70.2,19.15],[-70.1,19.15],[-70,19.15],[-70.6,19.25],[-70.5,19.25],[-70.4,19.25],[-70.3,19.25],[-70.2,19.25],[-70.1,19.25],[-70,19.25],[-70.6,19.35],[-70.5,19.35],[-70.4,19.35],[-70.3,19.35],[-70,19.35],[-71.5,19.45],[-71.4,19.45],[-71.3,19.45],[-71.1,19.45],[-71,19.45],[-70.8,19.45],[-70.7,19.45],[-70.6,19.45],[-70.1,19.45],[-70,19.45],[-71.6,19.55],[-71.5,19.55],[-71.4,19.55],[-71.3,19.55],[-71.2,19.55],[-71.1,19.55],[-71,19.55],[-70.9,19.55],[-70.8,19.55],[-70.3,19.55],[-70.1,19.55],[-70,19.55],[-71.6,19.65],[-71.5,19.65],[-71.4,19.65],[-71.3,19.65],[-71.2,19.65],[-71.1,19.65],[-71,19.65],[-70.5,19.65],[-70.4,19.65],[-70.3,19.65],[-70,19.65],[-71.6,19.75],[-71.5,19.75],[-71.4,19.75],[-71.3,19.75],[-71.2,19.75],[-71,19.75],[-70.9,19.75],[-70.8,19.75],[-70.6,19.75],[-70.5,19.75],[-70.4,19.75]];

// Mismo formato de id que los otros CSV: p19.15_-70.40
var points = ee.FeatureCollection(coords.map(function (c) {
  return ee.Feature(ee.Geometry.Point(c), {id: 'p' + c[1].toFixed(2) + '_' + c[0].toFixed(2)});
})).map(function (f) { return f.buffer(5000); }); // 5 km ≈ media celda de 0.1°

var dem = ee.Image('USGS/SRTMGL1_003');
// Pendiente en grados -> porcentaje (la unidad que usan los agrónomos)
var slope = ee.Terrain.slope(dem).multiply(Math.PI / 180).tan().multiply(100).rename('slope');

Map.addLayer(slope, {min: 0, max: 30, palette: ['1a9850', 'fee08b', 'd73027']}, 'Pendiente (%)');
Map.addLayer(points, {color: 'blue'}, 'Puntos');
Map.centerObject(points, 9);

var stats = slope.reduceRegions({
  collection: points,
  reducer: ee.Reducer.mean().combine(ee.Reducer.percentile([90]), '', true),
  scale: 30
}).map(function (f) {
  return ee.Feature(null, {id: f.get('id'), slope_mean: f.get('mean'), slope_p90: f.get('p90')});
});

print('Ejemplo (deben salir números):', stats.limit(3));

Export.table.toDrive({
  collection: stats,
  description: 'fieldshift_grid_terrain',
  fileFormat: 'CSV',
  selectors: ['id', 'slope_mean', 'slope_p90']
});
