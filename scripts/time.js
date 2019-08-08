var cachedData = null;
$(function() {
  d3.json("data/time_analysis.json").then(function(data) {
    // cache the data and visualize
    cachedData = data;
    visualizeTime();
  });
});

// Visualization constants and variables
const width = 1100;
const height = 600;
const margin = { top: 80, left: 100, bottom: 40, right: 10 };

const line = {
  colors: {
    production: "#f77189",
    import: "#50b131",
    export: "#3ba3ec"
  }
};

const axis = {
  color: "#ced4da",
  labelOffset: 10, // vertical offset of label from axis line
  labelWidth: 38
};

const oneMillion = 1000000;

var timeSVG = null;
var quantityScale = null;
var timeScale = null;

function visualizeTime() {
  // fill in the legend colors
  $(".production-color").css("color", line.colors.production);
  $(".import-color").css("color", line.colors.import);
  $(".export-color").css("color", line.colors.export);

  // add event listeners
  $("#country-select").on("change", function() {
    updateProduceSelect();
    updateDisplay();
  });
  $("#produce-select").on("change", updateDisplay);

  // fill the country select with all available countries
  var countrySelect = document.getElementById("country-select");
  cachedData["countries"].forEach(function(country) {
    var option = document.createElement("option");
    option.innerHTML = country;
    countrySelect.appendChild(option);
  });

  updateProduceSelect();

  // create the svg for the visualization
  timeSVG = d3
    .select("#time-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "red");

  // create groups for the axes
  timeSVG.append("g").attr("id", "quantity-axis");
  timeSVG.append("g").attr("id", "time-axis");

  updateDisplay();
}

function updateProduceSelect() {
  var updateSelection = d3
    .select("#produce-select")
    .selectAll("option")
    .data(cachedData[$("#country-select").val()]["produce"]);

  updateSelection.html(function(produce) {
    return produce;
  });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("option")
    .html(function(produce) {
      return produce;
    });
}

function updateDisplay() {
  var selectedData =
    cachedData[$("#country-select").val()][$("#produce-select").val()];

  // refresh both axes
  quantityScale = refreshAxis(
    "#quantity-axis",
    [0, selectedData["largest_quantity"]],
    [height - margin.bottom, margin.top],
    "vertical",
    "linear",
    function(quantity) {
      return quantity / oneMillion + "M";
    }
  );

  timeScale = refreshAxis(
    "#time-axis",
    selectedData["available_years"],
    d3.range(
      margin.left,
      width - margin.right,
      (width - margin.right - margin.left) /
        selectedData["available_years"].length
    ),
    "horizontal",
    "ordinal",
    function(year) {
      return year;
    }
  );

  var produceLine = d3
    .line()
    .x(function(d) {
      return timeScale(d["year"]);
    })
    .y(function(d) {
      return quantityScale(d["quantity"]);
    });

  timeSVG.append("path").datum(selectedData["Production"]).attr("d", produceLine);
}

function refreshAxis(
  axisID,
  domain,
  range,
  axisOrientation,
  scaleType,
  generateLabel
) {
  var scale = null;
  if (scaleType == "ordinal") {
    scale = d3.scaleOrdinal();
  } else {
    scale = d3.scaleLinear();
  }

  scale = scale.domain(domain).range(range);

  // axis lines
  var updateSelection = d3
    .select(axisID)
    .selectAll("line")
    .data(function() {
      if (scaleType == "ordinal") {
        return domain;
      }
      return scale.ticks();
    });

  updateSelection
    .transition()
    .attr("x1", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) - axis.labelWidth / 2;
      }
      return 0;
    })
    .attr("y1", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top;
      }
      return scale(tickValue);
    })
    .attr("x2", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) + axis.labelWidth / 2;
      }
      return width;
    })
    .attr("y2", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top;
      }
      return scale(tickValue);
    });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("line")
    .attr("x1", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) - axis.labelWidth / 2;
      }
      return 0;
    })
    .attr("y1", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top;
      }
      return scale(tickValue);
    })
    .attr("x2", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) + axis.labelWidth / 2;
      }
      return width;
    })
    .attr("y2", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top;
      }
      return scale(tickValue);
    })
    .attr("stroke", axis.color);

  // quantity axis labels
  updateSelection = d3
    .select(axisID)
    .selectAll("text")
    .data(function() {
      if (scaleType == "ordinal") {
        return domain;
      }
      return scale.ticks();
    });

  updateSelection
    .text(function(tickValue) {
      return generateLabel(tickValue);
    })
    .transition()
    .attr("x", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) - axis.labelWidth / 2;
      }
      return 0;
    })
    .attr("y", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top - axis.labelOffset;
      }
      return scale(tickValue) - axis.labelOffset;
    });

  updateSelection.exit().remove();

  updateSelection
    .enter()
    .append("text")
    .text(function(tickValue) {
      return generateLabel(tickValue);
    })
    .attr("x", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return scale(tickValue) - axis.labelWidth / 2;
      }
      return 0;
    })
    .attr("y", function(tickValue) {
      if (axisOrientation == "horizontal") {
        return margin.top - axis.labelOffset;
      }
      return scale(tickValue) - axis.labelOffset;
    })
    .style("fill", "black");

  // return the scale so it can be saved
  return scale;
}
