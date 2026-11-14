// FIELD SHIFT - Suelo de las 6 regiones (SoilGrids 2.0)
// Pegar en code.earthengine.google.com y pulsar Run.
// Copia el JSON que sale en la Consola y guárdalo como soil.json
// (en la misma carpeta que build-data.mjs).

var regions = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-70.50, 19.25]), {id: 'cibao'}),
  ee.Feature(ee.Geometry.Point([-60.57, -33.89]), {id: 'pampa'}),
  ee.Feature(ee.Geometry.Point([-5.10, 37.55]), {id: 'andalucia'}),
  ee.Feature(ee.Geometry.Point([35.27, 0.52]), {id: 'eldoret'}),
  ee.Feature(ee.Geometry.Point([75.85, 30.90]), {id: 'punjab'}),
  ee.Feature(ee.Geometry.Point([147.37, -35.12]), {id: 'riverina'})
]).map(function (f) {
  // Promediar 2 km alrededor del punto (evita píxeles vacíos de ciudades/ríos)
  return f.buffer(2000);
});

// Promedio ponderado 0-30 cm (5 + 10 + 15 cm)
function topsoil(asset, prop, divisor) {
  var img = ee.Image(asset);
  return img.select(prop + '_0-5cm_mean').multiply(5)
    .add(img.select(prop + '_5-15cm_mean').multiply(10))
    .add(img.select(prop + '_15-30cm_mean').multiply(15))
    .divide(30).divide(divisor).rename(prop);
}

var soil = topsoil('projects/soilgrids-isric/sand_mean', 'sand', 10)      // g/kg -> %
  .addBands(topsoil('projects/soilgrids-isric/clay_mean', 'clay', 10))    // g/kg -> %
  .addBands(topsoil('projects/soilgrids-isric/silt_mean', 'silt', 10))    // g/kg -> %
  .addBands(topsoil('projects/soilgrids-isric/phh2o_mean', 'phh2o', 10))  // pH*10 -> pH
  .addBands(topsoil('projects/soilgrids-isric/soc_mean', 'soc', 10));     // dg/kg -> g/kg

Map.addLayer(soil.select('sand'), {min: 0, max: 80, palette: ['fff7bc', 'fec44f', 'd95f0e']}, 'Arena 0-30 cm (%)');
Map.addLayer(regions, {color: 'red'}, 'Regiones');
Map.setCenter(0, 15, 2);

var result = soil.reduceRegions({collection: regions, reducer: ee.Reducer.mean(), scale: 250});

result.evaluate(function (fc) {
  var rows = fc.features.map(function (f) {
    var p = f.properties;
    return {id: p.id, sand: p.sand, clay: p.clay, silt: p.silt, ph: p.phh2o, soc: p.soc};
  });
  print('COPIA ESTO EN soil.json:');
  print(JSON.stringify(rows));
});
