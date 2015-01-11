// Enthält alle JS-relevanten Anteile des Projekt Wohnstandortanalyse Wien
// Geoweb Gruppe 05 - WS2014

// Grundkarte
var osmLayer = new ol.layer.Tile({style: 'Road', source: new ol.source.MapQuest({layer: 'osm'})});

// Kartendaten für Wien
var wmsLayer = new ol.layer.Image({
  source: new ol.source.ImageWMS({
    url: 'http://student.ifip.tuwien.ac.at/geoserver/wms',
    params: {'LAYERS': 'g05_2014:normalized,g05_2014:comments'}
  }),
  opacity: 0.6
});

// OL3 Kartenobjekt (Gesamt)
olMap = new ol.Map({
  target: 'map',
  renderer: 'canvas',
  layers: [osmLayer, wmsLayer],
  view: new ol.View({
    center: ol.proj.transform([16.3, 48.2], 'EPSG:4326', 'EPSG:3857'),
    zoom: 11,
    maxZoom: 19
  })
});

// Integration der Checkbox-gesteuerten Layer CarSharing, Haltestellen, Märkte, Parkzonen und Tempo30-Zone
// Die Umsetzung der Checkbox-Steuerung erfolgt unten.
var CarSharing = new ol.layer.Vector({
  source: new ol.source.GeoJSON({
    url: 'http://student.ifip.tuwien.ac.at/geoserver/g05_2014/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=g05_2014:CARSHARINGOGDPoint&outputFormat=json',
    projection: 'EPSG:3857'
  }),
    style: new ol.style.Style({
       image: new ol.style.Icon({src: 'http://data.wien.gv.at/katalog/images/carsharingogd.png',})
    })
});

var Haltestellen = new ol.layer.Vector({
  source: new ol.source.GeoJSON({
    url: 'http://student.ifip.tuwien.ac.at/geoserver/g05_2014/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=g05_2014:HALTESTELLEWLOGDPoint&outputFormat=json',
    projection: 'EPSG:3857'
  }),
    style: new ol.style.Style({
       image: new ol.style.Icon({src: 'http://data.wien.gv.at/katalog/images/haltestellewlogd.png',})
    })
});

var Maerkte = new ol.layer.Vector({
  source: new ol.source.GeoJSON({
    url: 'http://student.ifip.tuwien.ac.at/geoserver/g05_2014/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=g05_2014:MAERKTEOGDPoint&outputFormat=json',
    projection: 'EPSG:3857'
  }),
    style: new ol.style.Style({
       image: new ol.style.Icon({src: 'http://data.wien.gv.at/katalog/images/marktogd.png',})
    })
});

var Parkzonen = new ol.layer.Tile({
  	source: new ol.source.TileWMS({
	  url: 'http://student.ifip.tuwien.ac.at/geoserver/wms',
	  params: {VERSION: '1.1.0', LAYERS: 'g05_2014:PARKENGELTUNGOGDPolygon', TRANSPARENT: true, FORMAT: 'image/png'}
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

// Load variables into dropdown
$.get("data/datalist.txt", function(response) {
  // We start at line 3 - line 1 is column names, line 2 is not a variable
  $(response.split('\n').splice(2)).each(function(index, line) {
    $('#topics').append($('<option>')
      .val(line.substr(0, 10).trim())
      .html(line.substr(10, 105).trim()));
  });
});

// Add behaviour to dropdown
$('#topics').change(function() {
  wmsLayer.getSource().updateParams({
    'viewparams': 'column:' + $('#topics>option:selected').val()
  });
});

// Create an ol.Overlay with a popup anchored to the map
var popup = new ol.Overlay({
  element: $('#popup')
});
olMap.addOverlay(popup);

// Handle map clicks to send a GetFeatureInfo request and open the popup
olMap.on('singleclick', function(evt) {
  var view = olMap.getView();
  var url = wmsLayer.getSource().getGetFeatureInfoUrl(evt.coordinate,
      view.getResolution(), view.getProjection(), {'INFO_FORMAT': 'text/html'});
  popup.setPosition(evt.coordinate);
  $('#popup-content iframe').attr('src', url);
  $('#popup')
    .popover({content: function() { return $('#popup-content').html(); }})
    .popover('show');
  // Close popup when user clicks on the 'x'
  $('.popover-title').click(function() {
    $('#popup').popover('hide');
  });
  
  $('.popover form')[0].onsubmit = function(e) {
    var feature = new ol.Feature();
    feature.setGeometryName('geom');
    feature.setGeometry(new ol.geom.Point(evt.coordinate));
    feature.set('comment', this.comment.value);
    var xml = new ol.format.WFS().writeTransaction([feature], null, null, {
      featureType: 'comments', featureNS: 'http://geoweb/2014/g05',
      gmlOptions: {srsName: 'EPSG:3857'}
    });
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://student.ifip.tuwien.ac.at/geoserver/wfs', true);
    xhr.onload = function() {
      wmsLayer.getSource().updateParams({});
      alert('Vielen Dank für Ihren Kommentar.');
      alert(xhr.responseText);
    };
    xhr.send(new XMLSerializer().serializeToString(xml));
    e.preventDefault();
  };
});



// Submit query to Nominatim and zoom map to the result's extent
var form = document.forms[0];
form.onsubmit = function(evt) {
  var url = 'http://nominatim.openstreetmap.org/search?format=json&q=';
  url += form.query.value;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onload = function() {
    var result = JSON.parse(xhr.responseText);
    if (result.length > 0) {
      var bbox = result[0].boundingbox;
      olMap.getView().fitExtent(ol.proj.transform([parseFloat(bbox[2]),
          parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])],
          'EPSG:4326', 'EPSG:3857'), olMap.getSize());
    }
  };
  xhr.send();
  evt.preventDefault();
};

// Integration der Checkbox-Funktionalitäten
document.getElementById('CarSharing').onclick = function(e){
  if(this.checked == true)
  {
    olMap.addLayer(CarSharing);
    console.log("Added CarSharing-Layer.");
  }
  else
  {
    olMap.removeLayer(CarSharing);
    console.log("Removed CarSharing-Layer.");
  }
};

document.getElementById('Haltestellen').onclick = function(e){
  if(this.checked == true)
  {
    olMap.addLayer(Haltestellen);
    console.log("Added Haltestellen-Layer.");
  }
  else
  {
    olMap.removeLayer(Haltestellen);
    console.log("Removed Haltestellen-Layer.");
  }
};

document.getElementById('Maerkte').onclick = function(e){
  if(this.checked == true)
  {
    olMap.addLayer(Maerkte);
    console.log("Added Märkte-Layer.");
  }
  else
  {
    olMap.removeLayer(Maerkte);
    console.log("Removed Märkte-Layer.");
  }
};

document.getElementById('Parkpickerl').onclick = function(e){
  if(this.checked == true)
  {
    olMap.addLayer(Parkzonen);
    console.log("Added Parkpickerl-Layer.");
  }
  else
  {
    olMap.removeLayer(Parkzonen);
    console.log("Removed Parkpickerl-Layer.");
  }
};
