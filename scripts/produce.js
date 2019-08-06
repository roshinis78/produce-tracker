$(document).ready(function() {
  // if the data has not been fetched, fetch and cache it
  if (sessionStorage.getItem("cachedData") == null) {
    d3.json("data/top10_countries.json").then(function(data) {
      sessionStorage.setItem("cachedData", JSON.stringify(data));

      visualizeProduce();
    });
  } else {
    visualizeProduce();
  }
});

// Visualization constants and variables
const width = 1050;
const height = 600;
const margin = { top: 80, left: 100, bottom: 40, right: 10 };

const bar = {
  width: 20,
  spacing: 5,
  colors: {
    production: "#f77189",
    import: "#50b131",
    export: "#3ba3ec"
  }
};

const axis = {
  color: "#ced4da",
  labelOffset: 10, // vertical offset of label from axis line
  widthBuffer: 20 // accounts for stuff like Netherlands being wordwrapped as Netherland <break> s
};

const defaults = {
  produce: "Poppy seed"
};

var cachedData = null;
var quantityScale = null;
var countryScale = null;
var produceSVG = null;

function visualizeProduce() {
  cachedData = JSON.parse(sessionStorage.getItem("cachedData"));

  // fill the produce select with produce
  var produceSelect = document.getElementById("produce-select");
  cachedData["produce"].forEach(function(produce) {
    var option = document.createElement("option");
    option.innerHTML = produce;
    if (produce == defaults.produce) {
      option.selected = true;
    }
    produceSelect.appendChild(option);
  });

  // VIZ USER INPUT SELECT EVENT LISTENERS
  produceSelect.addEventListener("change", switchProduce);
  $("#role-select").on("change", updateDisplay);
  $("#year-select").on("change", updateDisplay);

  // ANIMATION CONTROL EVENT LISTENERS
  // animation can be started by EITHER pressing enter in the speed input OR pressing the play button
  $("#animation-speed").on("keypress", function(event) {
    if (event.key == "Enter") {
      event.preventDefault(); // prevent submit
      playYears();
    }
  });
  document.getElementById("play-button").addEventListener("click", playYears);

  // fill in the legend colors
  $(".production-color").css("color", bar.colors.production);
  $(".import-color").css("color", bar.colors.import);
  $(".export-color").css("color", bar.colors.export);

  // draw the svg
  produceSVG = d3
    .select("#produce-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // add groups for the axes
  produceSVG.append("g").attr("id", "quantity-axis");
  produceSVG.append("g").attr("id", "country-axis");
  d3.select("#produce-chart")
    .append("div")
    .attr("id", "country-axis-labels");

  // set default values for select inputs + call updateDisplay
  switchProduce();
}

function switchProduce() {
  var data = cachedData[$("#produce-select").val()];

  // update the year select options
  var selection = d3
    .select("#year-select")
    .selectAll("option")
    .data(data["available_years"]);

  // update existing options
  selection
    .html(function(year, i) {
      return year;
    })
    .attr("value", function(year, i) {
      return year;
    });
  // remove extra options
  selection.exit().remove();
  // add surplus options
  selection
    .enter()
    .append("option")
    .html(function(year, i) {
      return year;
    })
    .attr("value", function(year, i) {
      return year;
    });

  // default to producer view
  $("#role-option-producer").attr("selected", "true");

  updateDisplay();
}

var selectedRole = null;
var selectedProduce = null;
var selectedYear = null;
var selectedData = null;
function updateDisplay(
  updateQuantityScale = true, // by default update the quantity scale and axis
  fitScaleForAllYears = false, // by default, fit the quantity scale for the current year
  displayYear = null
) {
  // get the current selected inputs
  selectedRole = $("#role-select").val();
  selectedProduce = $("#produce-select").val();
  if (displayYear == null) {
    selectedYear = $("#year-select").val();
  } else {
    selectedYear = displayYear;
  }
  selectedData = cachedData[selectedProduce][selectedYear][selectedRole];

  // refresh the chart
  if (updateQuantityScale) {
    refreshQuantityAxis(fitScaleForAllYears);
  }
  refreshCountryAxis();
  refreshBars();

  console.log(
    "Displaying " +
      selectedRole +
      " of " +
      selectedProduce +
      " in " +
      selectedYear
  );
}

// CHART REFRESH FUNCTIONS - UPDATE THE DOM
function refreshQuantityAxis(fitScaleForAllYears) {
  // fit the scale to either the current year, or to all available years for the given produce
  var domainMax = cachedData[selectedProduce][selectedYear]["largest_quantity"];
  if (fitScaleForAllYears) {
    domainMax = cachedData[selectedProduce]["largest_quantity"];
  }

  quantityScale = d3
    .scaleLinear()
    .domain([0, domainMax])
    .range([height - margin.bottom, margin.top]);

  // update axis lines
  var updateSelection = d3
    .select("#quantity-axis")
    .selectAll("line")
    .data(quantityScale.ticks());

  updateSelection
    .transition()
    .attr("y1", function(d, i) {
      return quantityScale(d);
    })
    .attr("y2", function(d, i) {
      return quantityScale(d);
    });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("line")
    .attr("x1", 0)
    .attr("y1", function(d, i) {
      return quantityScale(d);
    })
    .attr("x2", width)
    .attr("y2", function(d, i) {
      return quantityScale(d);
    })
    .attr("stroke", axis.color);

  // update axis labels
  updateSelection = d3
    .select("#quantity-axis")
    .selectAll("text")
    .data(quantityScale.ticks());

  updateSelection
    .text(function(d, i) {
      const oneMillion = 1000000;
      return d / oneMillion + "M";
    })
    .attr("y", function(d, i) {
      return quantityScale(d) - axis.labelOffset;
    });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("text")
    .text(function(d, i) {
      const oneMillion = 1000000;
      return d / oneMillion + "M";
    })
    .attr("x", 0)
    .attr("y", function(d, i) {
      return quantityScale(d) - axis.labelOffset;
    });
}

function refreshCountryAxis() {
  // update the axis scale
  countryScale = d3
    .scaleOrdinal()
    .domain(selectedData["countries"])
    .range(
      d3.range(
        margin.left + 20,
        width - margin.right,
        (width - margin.right - margin.left - 20) /
          selectedData["countries"].length
      )
    );

  // update axis lines
  var updateSelection = produceSVG
    .select("#country-axis")
    .selectAll("line")
    .data(selectedData["countries"]);

  updateSelection
    .attr("x1", function(d, i) {
      return countryScale(d) - bar.width - bar.spacing;
    })
    .attr("x2", function(d, i) {
      return countryScale(d) + bar.width + bar.spacing + bar.width;
    });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("line")
    .attr("x1", function(d) {
      return countryScale(d) - bar.width - bar.spacing;
    })
    .attr("y1", margin.top)
    .attr("x2", function(d) {
      return countryScale(d) + bar.width + bar.spacing + bar.width;
    })
    .attr("y2", margin.top)
    .attr("stroke", axis.color);

  // update axis labels
  updateSelection = d3
    .select("#country-axis-labels")
    .selectAll(".country-axis-label")
    .data(selectedData["countries"]);

  // dispose of all tooltips
  $('[data-toggle="tooltip"]').tooltip("dispose");

  updateSelection
    .html(function(country, i) {
      return country;
    })
    .style("left", function(d, i) {
      return countryScale(d) - axis.widthBuffer / 2 + "px";
    })
    .attr("data-toggle", "tooltip")
    .attr("data-placement", "left")
    .attr("data-html", true)
    .attr("title", function(country, i) {
      const oneMillion = 1000000;
      var productionQuantity =
        (selectedData["production"][i] / oneMillion).toFixed(3) + "M";
      var importQuantity =
        (selectedData["import"][i] / oneMillion).toFixed(3) + "M";
      var exportQuantity =
        (selectedData["export"][i] / oneMillion).toFixed(3) + "M";
      return (
        "Production: " +
        productionQuantity +
        "<br>" +
        "Import: " +
        importQuantity +
        "<br>" +
        "Export: " +
        exportQuantity
      );
    });

  updateSelection
    .exit()
    .transition()
    .style("bottom", height + "px")
    .remove();

  updateSelection
    .enter()
    .append("div")
    .attr("class", "country-axis-label")
    .attr("data-toggle", "tooltip")
    .attr("data-placement", "left")
    .attr("data-html", true)
    .attr("title", function(country, i) {
      const oneMillion = 1000000;
      var productionQuantity =
        (selectedData["production"][i] / oneMillion).toFixed(3) + "M";
      var importQuantity =
        (selectedData["import"][i] / oneMillion).toFixed(3) + "M";
      var exportQuantity =
        (selectedData["export"][i] / oneMillion).toFixed(3) + "M";
      return (
        "Production: " +
        productionQuantity +
        "<br>" +
        "Import: " +
        importQuantity +
        "<br>" +
        "Export: " +
        exportQuantity
      );
    })
    .html(function(country, i) {
      return country;
    })
    .style("position", "absolute")
    .style("left", function(d, i) {
      return countryScale(d) - axis.widthBuffer / 2 + "px";
    })
    .style("width", function(d, i) {
      return 3 * bar.width + 2 * bar.spacing + axis.widthBuffer + "px";
    })
    // we set offset from bottom instead of top to account for word wrap height changes
    .style("bottom", height + "px")
    .transition()
    .style("bottom", height - margin.top + axis.labelOffset + "px");

  $('[data-toggle="tooltip"]').tooltip();
}

function refreshBars() {
  ["production", "import", "export"].forEach(function(role) {
    var updateSelection = produceSVG
      .selectAll("." + role + "-bar")
      .data(selectedData["countries"]);

    updateSelection
      .attr("x", function(d, i) {
        return {
          production: countryScale(d) - bar.width - bar.spacing,
          import: countryScale(d),
          export: countryScale(d) + bar.width + bar.spacing
        }[role];
      })
      .transition()
      .attr("y", function(d, i) {
        return quantityScale(selectedData[role][i]);
      })
      .attr("height", function(d, i) {
        return height - margin.bottom - quantityScale(selectedData[role][i]);
      });

    // remove bars for countries that fall out of the top 10
    updateSelection
      .exit()
      .transition()
      .attr("height", 0)
      .remove();

    // add bars for countries that just entered the top 10
    updateSelection
      .enter()
      .append("rect")
      .attr("x", function(d, i) {
        return {
          production: countryScale(d) - bar.width - bar.spacing,
          import: countryScale(d),
          export: countryScale(d) + bar.width + bar.spacing
        }[role];
      })
      .attr("y", height)
      .transition()
      .attr("y", function(d, i) {
        return quantityScale(selectedData[role][i]);
      })
      .attr("width", bar.width)
      .attr("height", 0)
      .transition()
      .attr("height", function(d, i) {
        return height - margin.bottom - quantityScale(selectedData[role][i]);
      })
      .attr("fill", bar.colors[role])
      .attr("class", role + "-bar");
  });
}

// ANIMATION RELATED FUNCTIONS
var playYearsInterval = null;
var startYearIndex = null;
var currentYearIndex = null;
var availableYears = null;
function playYears() {
  // play the animation
  if (playYearsInterval == null) {
    // animation speed is validated on the client side
    if (!document.getElementById("animation-speed").checkValidity()) {
      return;
    }
    var animationSpeed = $("#animation-speed").val() * 1000;

    // lock all inputs
    $("select, #animation-speed").attr("disabled", true);

    // display the currently selected year with the overall scale
    availableYears = cachedData[selectedProduce]["available_years"];
    startYearIndex = currentYearIndex = availableYears.indexOf(
      parseInt($("#year-select option:selected").html())
    );
    updateDisplay((updateQuantityScale = true), (fitScaleForAllYears = true));

    // switch play button to stop button
    $("#play-button").html("<i class='fa fa-inverse fa-square'></i>");

    // schedule switching the displayed year every 'animationSpeed' seconds
    playYearsInterval = setInterval(playNextYear, animationSpeed);
  }
  // stop the animation
  else {
    stopPlayingYears();
  }
}

function playNextYear() {
  // if there are no more available years, exit the animation
  if (++currentYearIndex == availableYears.length) {
    stopPlayingYears();
  }
  // otherwise, display the next available year
  else {
    // change the year displayed in the year select
    document.getElementById("year-select").selectedIndex = currentYearIndex;

    updateDisplay(
      (updateQuantityScale = false),
      (fitScaleForAllYears = false),
      availableYears[currentYearIndex]
    );
  }
}

function stopPlayingYears() {
  clearInterval(playYearsInterval);
  playYearsInterval = null;

  document.getElementById("year-select").selectedIndex = startYearIndex;
  // revert back to the year that was selected prior to the animation
  updateDisplay(
    (updateQuantityScale = false),
    (fitScaleForAllYears = false),
    availableYears[startYearIndex]
  );

  // switch back to play button
  $("#play-button").html("<i class='fa fa-inverse fa-play'></i>");

  // unlock all inputs
  $("select, #animation-speed").removeAttr("disabled");
}
