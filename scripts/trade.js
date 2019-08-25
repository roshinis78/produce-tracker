// called once when the page loads
// Visualization constants and variables
const width = $(window).width();
const height = $(window).height();
const margin = { top: 35, left: 120, bottom: 40, right: 10 };

var line = {
  pointRadius: 2,
  colors: null,
  label: {
    letterWidth: 7,
    verticalOffset: 13
  }
};

var tradeSVG = null;
var mapProjection = null;
var addedCountry = null;
var tradeJSON = null;
var activeCountryIDs = new Map();
var colorIndex = 0;
const colorStep = 28;
var relevantTradeData = null;

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
    d3.json("data/country_colors.json").then(function(data) {
      line.colors = data.colors;

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

        // add event listeners
        // add event listeners
        // collapse the toolbar on click
        $(".toolbar-title").on("click", function() {
          if ($(".toolbar").css("left") == "0px") {
            $(".toolbar").css("left", "-25%");
          } else {
            $(".toolbar").css("left", "0%");
          }
        });

        // switch display to show all goods or just produce
        $("#all-goods-radio, #only-produce-radio").on("click", function() {
          if ($(this).val() == "only-produce") {
            $(".all-goods").css("opacity", 0);
            $(".only-produce").css("opacity", 1);
          } else {
            $(".all-goods").css("opacity", 1);
            $(".only-produce").css("opacity", 0);
          }
        });

        // add selected country to display on button click if it is not already being displayed
        $("#add-country-button").on("click", addCountry);
      });
    });
  });
});

// draw the map to the display using a mercator projection
function drawMap(data) {
  mapProjection = d3.geoMercator().fitWidth(width, data);
  var pathGenerator = d3.geoPath(mapProjection);

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

// visualize the import or export trade lines for the most recently added country
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
    .attr("id", activeCountryIDs.get(addedCountry) + "-trade-line")
    .selectAll("path")
    .data(function() {
      return (relevantTradeData = tradeJSON[addedCountry][
        "previous_goods_only"
      ].concat(tradeJSON[addedCountry]["all_goods"]));
    })
    .enter()
    .append("path")
    .attr("class", function(good, i) {
      if (i < tradeJSON[addedCountry]["previous_goods_only"].length) {
        return "only-produce";
      }
      return "all-goods";
    })
    .datum(function(good) {
      return [
        good["Coordinates"]["to_country"],
        good["Coordinates"]["from_country"]
      ];
    })
    .attr("d", pathGenerator)
    .style("stroke", function(d, i) {
      if (i == 0) {
        colorIndex = (colorIndex + colorStep) % line.colors.length;
      }
      return line.colors[colorIndex];
    })
    .style("stroke-width", "2px");

  // add country labels
  d3.select("#trade-chart-labels")
    .append("div")
    .attr("id", activeCountryIDs.get(addedCountry) + "-labels")
    .selectAll("div")
    .data([relevantTradeData[0], ...relevantTradeData])
    .enter()
    .append("div")
    .attr("class", function(good, i){
      if(i == 0){
        return '';
      }
      else if (i <= (tradeJSON[addedCountry]["previous_goods_only"]).length) {
        return "only-produce"
      }
      return "all-goods"
    })
    .style("position", "absolute")
    .style("top", function(good, i) {
      if (i == 0) {
        return (
          mapProjection(good["Coordinates"]["to_country"])[1] -
          line.label.verticalOffset +
          "px"
        );
      }
      return (
        mapProjection(good["Coordinates"]["from_country"])[1] -
        line.label.verticalOffset +
        "px"
      );
    })
    .style("left", function(good, i) {
      if (i == 0) {
        return (
          mapProjection(good["Coordinates"]["to_country"])[0] -
          (good["to_country"].length / 2) * line.label.letterWidth +
          "px"
        );
      }
      return (
        mapProjection(good["Coordinates"]["from_country"])[0] -
        (good["from_country"].length / 2) * line.label.letterWidth +
        "px"
      );
    })
    .html(function(good, i) {
      if (i == 0) {
        return good["to_country"];
      }
      return good["from_country"];
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

// add a country to the display and toolbar if it is not already on the display
function addCountry() {
  if (!activeCountryIDs.has($("#add-country-select").val())) {
    // visualize the trade lines
    addedCountry = $("#add-country-select").val();
    activeCountryIDs.set(addedCountry, createCountryID(addedCountry));
    visualizeTrade();

    // add the country to the toolbar view list
    d3.select("#current-view-list")
      .append("li")
      .attr("width", "100%")
      .attr("id", activeCountryIDs.get(addedCountry) + "-list-element")
      .append("h5")
      .attr("class", "d-flex")
      .html(
        "<i class='fas fa-square mr-2' style='color:" +
          line.colors[colorIndex] +
          "'></i>" +
          addedCountry +
          "<button type='button' class='remove-country-button' value='" +
          addedCountry +
          "'><i class='fas fa-minus-circle'></i></button>"
      );

    $(".remove-country-button:last").on("click", function() {
      console.log("hello!");
      removeCountry($(this).val());
    });

    console.log("Added " + addedCountry + " to display!");
  }
}

// remove a country from the display and toolbar
function removeCountry(countryToDelete) {
  var countryToDeleteID = activeCountryIDs.get(countryToDelete);

  // remove country from list
  $("#" + countryToDeleteID + "-list-element").remove();

  // remove country from the display
  $("#" + countryToDeleteID + "-trade-line").remove();
  $("#" + countryToDeleteID + "-labels").remove();
  activeCountryIDs.delete(countryToDelete);

  console.log("Removed " + countryToDelete + " from display");
}
