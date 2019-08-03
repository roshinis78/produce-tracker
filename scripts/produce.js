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
  labelOffset: 10
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
  console.log(selection);

  // update existing options
  selection.html(function(year, i) {
    return year;
  });
  // remove extra options
  selection.exit().remove();
  // add surplus options
  selection
    .enter()
    .append("option")
    .html(function(year, i) {
      console.log(year);
      return year;
    });

  // defaults: producer view and most recent year
  $("#role-option-producer").attr("selected", "true");
  $("#year-select option:last").attr("selected", true);

  updateDisplay();
}

function updateDisplay(
  updateQuantityScale = true,
  fitScaleForAllYears = false,
  addTooltips = true
) {
  // redraw the quantity axis
  if (updateQuantityScale) {
    refreshQuantityAxis(fitScaleForAllYears);
  }

  refreshCountryAxis(addTooltips);
  // update the bars for production, import and export quantities (in that order)
  //refreshBars();

  // set the max-width for all country label poppers
  $(".country-label").css("max-width", bar.width * 3 + bar.spacing * 2 + 20);

  // enable all tooltips
  $('[data-toggle="tooltip"]').tooltip();
}

function refreshQuantityAxis(fitScaleForAllYears) {
  var selectedProduce = $("#produce-select").val();
  var selectedYear = $("#year-select").val();

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

var topCountries = null;
function refreshCountryAxis(addTooltips) {
  var selectedRole = $("#role-select").val();
  var selectedProduce = $("#produce-select").val();
  var selectedYear = $("#year-select").val();
  topCountries = cachedData[selectedProduce][selectedYear][selectedRole];

  // update the axis scale
  countryScale = d3
    .scaleOrdinal()
    .domain(topCountries)
    .range(
      d3.range(
        margin.left + 20,
        width - margin.right,
        (width - margin.right - margin.left - 20) / topCountries.length
      )
    );

  // update axis lines
  var updateSelection = produceSVG
    .select("#country-axis")
    .selectAll("line")
    .data(topCountries);

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
    .data(topCountries);

  updateSelection
    .html(function(country, i) {
      return country;
    })

    .style("left", function(d, i) {
      return countryScale(d) + "px";
    });

  updateSelection
    .exit()
    .transition()
    .style("left", width + "px")
    .remove();

  updateSelection
    .enter()
    .append("div")
    .attr("class", "country-axis-label")
    .html(function(country, i) {
      return country;
    })
    .style("position", "absolute")
    // we set offset from bottom instead of top to account for word wrap height changes
    .style("bottom", height - margin.top + axis.labelOffset + "px")
    .style("left", "0px")
    .transition()
    .style("left", function(d, i) {
      return countryScale(d) + "px";
    })
    .style("width", function(d, i) {
      return 3 * bar.width + 2 * bar.spacing + 10 + "px";
    });
}

function refreshBars() {
  ["production", "import", "export"].forEach(function(role) {
    console.log(role);
    var selection = produceSVG
      .selectAll("." + role + "-bar")
      .data(selectedData["countries"].sort());

    // update bars for countries that are already in the top 10
    selection
      .transition()
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
    selection
      .exit()
      .transition()
      .attr("height", 0)
      .remove();

    // add bars for countries that just entered the top 10
    selection
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
function playYears() {
  // play the animation
  if (playYearsInterval == null) {
    // animation speed is validated on the client side
    if (!document.getElementById("animation-speed").checkValidity()) {
      return;
    }
    var animationSpeed = $("#animation-speed").val() * 1000;

    // switch play button to stop button
    $("#play-button").html("<i class='fa fa-inverse fa-square'></i>");

    // display the first available year, then every available year after that
    $("#year-select option:selected").removeAttr("selected");
    $("#year-select option:first").attr("selected", true);
    updateDisplay(
      (updateQuantityScale = true),
      (fitScaleForAllYears = true),
      (addTooltips = false)
    );

    // hide tooltips
    $(".tooltip").hide();

    playYearsInterval = setInterval(playNextYear, animationSpeed);
  }
  // stop the animation
  else {
    $("#play-button").html("<i class='fa fa-inverse fa-play'></i>");
    clearInterval(playYearsInterval);
    updateDisplay(
      (updateQuantityScale = false),
      (fitScaleForAllYears = false),
      (addTooltips = true)
    );
    playYearsInterval = null;
  }
}

function playNextYear() {
  // if there are no more available years, re-enable the play button and exit
  if ($("#year-select option:selected").next().length == 0) {
    $("#play-button").html("<i class='fa fa-inverse fa-play'></i>");
    clearInterval(playYearsInterval);
    playYearsInterval = null;
  }

  // display the next available year
  else {
    var previouslySelected = $("#year-select option:selected");
    previouslySelected.next().attr("selected", true);
    previouslySelected.removeAttr("selected");
    updateDisplay(
      (updateQuantityScale = false),
      (fitScaleForAllYears = false),
      (addTooltips = false)
    );
  }
}
