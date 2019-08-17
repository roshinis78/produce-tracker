// called once when the page loads
// Visualization constants and variables
const width = 1100;
const height = 600;
const margin = { top: 35, left: 120, bottom: 40, right: 10 };

var line = {
  pointRadius: 2,
  colors: null
};

var tradeSVG = null;
var mapProjection = null;
var selectedCountry = "Costa Rica";

$(function() {
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

      // visualize the data
      d3.json("data/trade_top_imports.json").then(function(data) {
        visualizeTrade(data);
      });
    });

  });
});

function drawMap(data) {
  mapProjection = d3.geoMercator();
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

function visualizeTrade(data) {
  console.log(data);
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
    .selectAll("path")
    .data(data[selectedCountry]["previous_goods_only"])
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
    .select("#trade-lines")
    .selectAll("circle")
    .data(data[selectedCountry]["previous_goods_only"])
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
