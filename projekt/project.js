// Enthält alle JS-relevanten Anteile des Projekt Wohnstandortanalyse Wien
// Geoweb Gruppe 05 - WS2014

var marker = new ol.Feature();
var map = new ol.Map({
target: 'map',
layers: [
new ol.layer.Tile({
source: new ol.source.MapQuest({layer: 'osm'})
}),
new ol.layer.Vector({
  source: new ol.source.Vector({
    features: [marker]
  })
})
],
view: new ol.View({
center: ol.proj.transform([16.3, 48.2], 'EPSG:4326', 'EPSG:3857'),
zoom: 11,
maxZoom: 19
})
});
// Umwandlung in eine Funktion, die auch durch den Button "Zurücksetzen" aufgerufen werden kann.
function SetUserLocation() {
var geolocation = new ol.Geolocation({projection: 'EPSG:3857'});
geolocation.setTracking(true); // here the browser may ask for confirmation
geolocation.on('change', function() {
  geolocation.setTracking(false);
  // map.getView().setCenter(geolocation.getPosition());
  // Anhand der Accuracy-Geometry wird der Map-View angepasst.
  map.getView().fitGeometry(geolocation.getAccuracyGeometry(), map.getSize(), { nearest: true, maxZoom: 19 });
  marker.setGeometry(new ol.geom.Point(map.getView().getCenter()));
  console.log("Geometry Accuracy: " + geolocation.getAccuracy() + " m");
 });
}
 SetUserLocation();
 var form = document.getElementById("search");
 
 form.onsubmit = function(evt) {
   evt.preventDefault();
   var countryrestriction = '';
   // Wenn die Checkbox AT-only im Status checked ist, wird dem Suchstring noch die AT-Begrenzung angehangen.
   if (form.elements["austria-only"].checked == true)
   {
   		countryrestriction = '&countrycodes=at';
   }
   var url = 'http://nominatim.openstreetmap.org/search?format=json&q=' + form.query.value + countryrestriction;
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, true);
   xhr.onload = function() {
    var result = JSON.parse(xhr.responseText);
    var bbox = result[0].boundingbox; // Task: Die Kartenansicht zoomt auf die BoundingBox des Suchergebnisses.
    var extent = /** @type {ol.Extent} */ [
      parseFloat(bbox[2]), parseFloat(bbox[0]), 
      parseFloat(bbox[3]), parseFloat(bbox[1])
      ];
      form.elements["query"].value = result[0].display_name;
    console.log(result[0].display_name);
    map.getView().fitExtent(ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857'), map.getSize());
};
xhr.send();
}
