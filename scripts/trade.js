// called once when the page loads
// Visualization constants and variables
const width = $(window).width();
const height = $(window).height();
const margin = { top: 35, left: 120, bottom: 40, right: 10 };

var line = {
  pointRadius: 2,
  colors: null
};

var tradeSVG = null;
var mapProjection = null;
var selectedCountries = [];
var addedCountry = null;
var tradeJSON = null;

$(function() {
  // add event listeners
  // collapse the toolbar on click
  $(".toolbar-title").on("click", function() {
    if ($(".toolbar").css("left") == "0px") {
      $(".toolbar").css("left", "-25%");
    } else {
      $(".toolbar").css("left", "0%");
    }
  });

  // add selected country to display on button click
  $("#add-country-button").on("click", function() {
    addedCountry = $("#add-country-select").val();
    selectedCountries.push(addedCountry);
    visualizeTrade();
    console.log("Added " + addedCountry + " to display!");
  });

  // read the map data
  d3.json("data/countries.json").then(function(data) {
    // create the SVG
    tradeSVG = d3
      .select("#trade-chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    tradeSVG.append("g").attr("id", "map");
    tradeSVG.append("g").attr("id", "trade-lines");

    // draw the map
    drawMap(data);

    // read the color palette
    d3.json("data/color_palette.json").then(function(colors) {
      line.colors = colors;

      // read the trade dataset
      d3.json("data/trade_top_imports.json").then(function(data) {
        // save the data
        tradeJSON = data;

        // fill in the country select
        d3.select("#add-country-select")
          .selectAll("option")
          .data(tradeJSON.countries)
          .enter()
          .append("option")
          .html(function(country) {
            return country;
          });
      });
    });
  });
});

function drawMap(data) {
  mapProjection = d3.geoMercator().fitWidth(width, data);
  var pathGenerator = d3.geoPath(mapProjection);

  var mapPalette = [
    "#a1c9f4",
    "#ffb482",
    "#8de5a1",
    "#ff9f9b",
    "#d0bbff",
    "#debb9b",
    "#fab0e4",
    "#cfcfcf",
    "#fffea3",
    "#b9f2f0",
    "#a1c9f4",
    "#ffb482",
    "#8de5a1",
    "#ff9f9b",
    "#d0bbff"
  ];

  tradeSVG
    .select("#map")
    .selectAll("path")
    .data(data.features)
    .enter()
    .append("path")
    .attr("d", pathGenerator)
    .attr("stroke", "gainsboro")
    .attr("fill", "white");
}

function visualizeTrade() {
  // lines for trade paths
  var pathGenerator = d3
    .line()
    .x(function(coordinates) {
      return mapProjection(coordinates)[0];
    })
    .y(function(coordinates) {
      return mapProjection(coordinates)[1];
    });

  tradeSVG
    .select("#trade-lines")
    .append("g")
    .attr("id", createCountryID(addedCountry))
    .selectAll("path")
    .data(tradeJSON[addedCountry]["previous_goods_only"])
    .enter()
    .append("path")
    .datum(function(good) {
      return [
        good["Coordinates"]["to_country"],
        good["Coordinates"]["from_country"]
      ];
    })
    .attr("d", pathGenerator)
    .style("stroke", line.colors.import)
    .style("stroke-width", "2px");

  // circles for countries
  tradeSVG
    .select("#trade-lines #" + createCountryID(addedCountry))
    .selectAll("circle")
    .data(tradeJSON[addedCountry]["previous_goods_only"])
    .enter()
    .append("circle")
    .attr("r", line.pointRadius)
    .attr("cx", function(good) {
      return mapProjection(good["Coordinates"]["from_country"])[0];
    })
    .attr("cy", function(good) {
      return mapProjection(good["Coordinates"]["from_country"])[1];
    });
}

// creates a valid html id (no spaces) for a given country
function createCountryID(country) {
  return country
    .toLowerCase()
    .replace(/\(/, "")
    .replace(/\)/, "")
    .replace(/\s/g, "-")
    .replace(/\'/, "-")
    .replace(/,/, "");
}
