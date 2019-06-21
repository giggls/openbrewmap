/* Open campsite Map 

(c) 2019 Sven Geggus <sven-osm@geggus.net>

*/

/* stylesheet for dynamic stuff */
var dynsheet = document.createElement('style');
document.head.appendChild(dynsheet);

var osmde = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: l10n['attribution']
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: l10n['attribution']
});

var otopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: l10n['attribution']
});

var esri_img = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: l10n['esri_attribution']
});

var hiking = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
      maxZoom: 18,
});

var cycling = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
      maxZoom: 18,
});

var baseMaps = {
    "OSMde": osmde,
    "OSM": osm,
    "TOPO": otopo,
    "World Imagery": esri_img
};

var overlayMaps = {
    '<img src="cicons/hiking.svg">': hiking,
    '<img src="cicons/cycling.svg">': cycling
};
  
var map = L.map('map', {
   layers: [baseMaps[l10n['mapstyle']]]
});

// default view: frankonia :)
if (window.location.href.indexOf('#') < 0) {
  map.setView([49.9070, 10.9602], 10);
}

var geocoderControl = new L.Control.geocoder({
        showResultIcons: true
});
geocoderControl.addTo(map);
  
L.control.layers(baseMaps, overlayMaps).addTo(map);
L.control.scale({position: 'bottomright'}).addTo(map);

var hash = new L.Hash(map,baseMaps,overlayMaps,CategoriesFromHash,["f"]);

var sidebar = L.control.sidebar('sidebar').addTo(map);

var LeafIcon = L.Icon.extend({
    options: {
        iconSize:     [32, 40],
        iconAnchor:   [16, 40]
    }
});

// Setup associative arrays which contains all custom icons we have
var public_icons = new Array();
var private_icons = new Array();
var categories=["micro","craft","industrial"];

var cat_color = { "craft": "#225500",
                  "micro": "#552200",
                  "industrial": "#000080"
                };
                
// iterate over the names from geoJSON which are used as a reference to the
// corresponding icon instances
categories.forEach(function(entry) {
  public_icons[entry] = new LeafIcon({iconUrl: 'markers/m_'+entry+'.png'});
  private_icons[entry] = new LeafIcon({iconUrl: 'markers/m_private_'+entry+'.png'});
});

var gjson = L.uGeoJSONLayer({endpoint: "/getbreweries", usebbox:true, minzoom:10 }, {
  // called when drawing point features
  pointToLayer: function (featureData, latlng) {
    // standard icon is fallback
    var icon = public_icons['standard'];

    if (categories.indexOf(featureData.properties["category"]) >= 0) {
      icon = public_icons[featureData.properties["category"]];
      if ('access' in featureData.properties) {
        if (private_values.indexOf(featureData.properties['access']) >= 0) {
          icon = private_icons[featureData.properties["category"]];
          if (!(document.getElementById('private_'+featureData.properties["category"]).checked)) {
            return;
          };
        } else {
          if (!(document.getElementById(featureData.properties["category"]).checked)) {
            return;
          };
        };
      } else {
        if (!(document.getElementById(featureData.properties["category"]).checked)) {
          return;
        };
      };
    };
    return L.marker(latlng, {icon: icon});
  },
  // Executes on each feature in the dataset
  onEachFeature: function (featureData, featureLayer) {
    featureLayer.on('click', function () {
      updateSidebars(featureData);
    });
  }
}).addTo(map);

function updateSidebars(featureData) {
     f2html(featureData);
      f2bugInfo(featureData);
      var cat;
      var private = false;
      if ('access' in featureData.properties) {
        if (private_values.indexOf(featureData.properties['access']) >= 0) {
          private = true;
        };
      };
      if (categories.indexOf(featureData.properties["category"]) >= 0) {
        cat=featureData.properties["category"];
      } else {
        cat="standard";
      }
      if (private) {
        dynsheet.innerHTML = ".sidebar-header, .sidebar-tabs > ul > li.active {background-color: "+cat_color['private']+";}";
        
      } else {
        dynsheet.innerHTML = ".sidebar-header, .sidebar-tabs > ul > li.active {background-color: "+cat_color[cat]+";}";
      };
      var html;
      if (private) {
        html = '<img src=\"markers/l_private_'+ cat + '.svg\"> ' + l10n[cat];
      } else {
        html = '<img src=\"markers/l_'+ cat + '.svg\"> ' + l10n[cat];
      };
      document.getElementById('cs_cat').innerHTML = html;
      sidebar.open('info');
}

function openURL(lang) {
  var urlpos=window.location.href.split("#");
  var baseurl=urlpos[0].replace(/[^/]*$/g,"")
  window.open(baseurl+'index.html.'+lang+'#'+urlpos[1], '_self');
};

for (var i = 0; i < categories.length ; i++) {
  document.getElementById(categories[i]).addEventListener('click', function() {
    gjson.onMoveEnd();
    CategoriesToHash();
  });
};

function CategoriesToHash() {
  var newhash=0;
  
  console.log("CategoriesToHash");

  for (var i = 0; i < categories.length ; i++) {
    if (document.getElementById(categories[i]).checked) {
      console.log(Math.pow(2,i));
      newhash+=Math.pow(2,i);
    }
  }
  // do not store additional options in hash
  hash.updateAUX([newhash.toString(16)]);
}

function CategoriesFromHash(hash) {
  var h0;
  h0 = "f"+hash[0][0];
  
  if (hash.length > 1) {
    get_site_data(hash.slice(1));
  }
  
  // we support up to 4 categories (0-f)
  var bstr = parseInt(h0, 16).toString(2);
  for (var i = 0; i < categories.length; i++) {
    if (bstr[7-i] == 1) {
      document.getElementById(categories[i]).checked=true;
    } else {
      document.getElementById(categories[i]).checked=false;
    }
  }
}

/*

fetch campsite data as given on URL bar and update sidebar accordingly 


*/
function get_site_data(type_id) {
  var osm_id;
  if (["node","way","relation"].indexOf(type_id[0]) == -1) {
    return
  }
  if ((osm_id=Number(type_id[1])) == NaN) {
    return
  }
  var gcsr = new XMLHttpRequest();
  gcsr.open("GET", "/getbreweries?osm_id="+osm_id+"&osm_type="+type_id[0]);
  gcsr.addEventListener('load', function(event) {
  if (gcsr.status >= 200 && gcsr.status < 300) {
      var obj = JSON.parse(gcsr.responseText);
      updateSidebars(obj.features[0]);
      hash.aux=[hash.aux[0]];
    } else {
      console.warn(gcsr.statusText, gcsr.responseText);
    }
  });
  gcsr.send();
}
