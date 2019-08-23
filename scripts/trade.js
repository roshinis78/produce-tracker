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
var addedCountry = null;
var tradeJSON = null;
var activeCountryIDs = new Map();
var colorIndex = 0;
const colorStep = 28;
var whichGoods = "previous_goods_only";

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

  // show all goods or just produce
  $("#all-goods-radio, #only-produce-radio").on("click", function() {
    whichGoods = $(this).val();

    // make a copy of the active countries from the map key iterator
    var countriesToRedraw = [];
    for(let country of activeCountryIDs.keys()){
      countriesToRedraw.push(country);
    }

    // to be continued...
  });

  // add selected country to display on button click if it is not already being displayed
  $("#add-country-button").on("click", function() {
    if (($("#add-country-select").val() != null) && (!activeCountryIDs.has($("#add-country-select").val()))) {
      // add the country to the display
      addedCountry = $("#add-country-select").val();
      activeCountryIDs.set(addedCountry, createCountryID(addedCountry));
      visualizeTrade();

      // add the country to the display list
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
        console.log("hello!")
          removeCountry($(this).val());
      });

      console.log("Added " + addedCountry + " to display!");
    }
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
      });
    });
  });
});

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
    .data(tradeJSON[addedCountry][whichGoods])
    .enter()
    .append("path")
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

  // circles for countries
  var toCountryCoordinates = null;
  tradeSVG
    .select(
      "#trade-lines #" + activeCountryIDs.get(addedCountry) + "-trade-line"
    )
    .selectAll("circle")
    .data(tradeJSON[addedCountry][whichGoods])
    .enter()
    .append("circle")
    .attr("r", line.pointRadius)
    .attr("cx", function(good, i) {
      // record the coordinates of the country which is importing the goods once
      if (i == 0) {
        toCountryCoordinates = good["Coordinates"]["to_country"];
      }
      return mapProjection(good["Coordinates"]["from_country"])[0];
    })
    .attr("cy", function(good) {
      return mapProjection(good["Coordinates"]["from_country"])[1];
    });

  // add a dot for the 'to country' -- the country which is importing the goods
  tradeSVG
    .select(
      "#trade-lines #" + activeCountryIDs.get(addedCountry) + "-trade-line"
    )
    .append("circle")
    .attr("r", line.pointRadius)
    .attr("cx", mapProjection(toCountryCoordinates)[0])
    .attr("cy", mapProjection(toCountryCoordinates)[1]);

  // add country labels
  d3.select("#trade-chart-labels")
    .append("div")
    .attr("id", activeCountryIDs.get(addedCountry) + "-labels")
    .selectAll("div")
    .data(function() {
      // create a set containing all the 'from countries' and the 'to country'
      var countrySet = new Set(addedCountry);
      var countryArray = [];

      tradeJSON[addedCountry][whichGoods].forEach(function(good, i) {
        if (!countrySet.has(good["from_country"])) {
          countrySet.add(good["from_country"]);

          // push the first good twice so we can have data for the 'to country'
          if (i == 0) {
            countryArray.push(good);
          }
          countryArray.push(good);
        }
      });

      return countryArray;
    })
    .enter()
    .append("div")
    .style("position", "absolute")
    .style("top", function(good, i) {
      if (i == 0) {
        return mapProjection(good["Coordinates"]["to_country"])[1] + "px";
      }
      return mapProjection(good["Coordinates"]["from_country"])[1] + "px";
    })
    .style("left", function(good, i) {
      if (i == 0) {
        return mapProjection(good["Coordinates"]["to_country"])[0] + "px";
      }
      return mapProjection(good["Coordinates"]["from_country"])[0] + "px";
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

// remove a country from the display and display list
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
