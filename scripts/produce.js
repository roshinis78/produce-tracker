$(document).ready(function() {
  // if the data has not been fetched, fetch and cache it
  if (sessionStorage.getItem("cachedProduceData") == null) {
    d3.json("data/top10_imp_exp_prod.json").then(function(data) {
      sessionStorage.setItem("cachedProduceData", JSON.stringify(data));

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
  color: "#ced4da"
};

var cachedProduceData = null;
var produceVisualization = null;
var quantityScale = null;
var produceSVG = null;

function visualizeProduce() {
  cachedProduceData = JSON.parse(sessionStorage.getItem("cachedProduceData"));

  // fill the produce select with produce
  var produceSelect = document.getElementById("produce-select");
  cachedProduceData["produce"].forEach(function(produce) {
    var option = document.createElement("option");
    option.innerHTML = produce;
    if (produce == "Poppy seed") {
      option.selected = true;
    }
    produceSelect.appendChild(option);
  });

  // add an event listener for the produce select
  produceSelect.addEventListener("change", switchProduce);

  // add display update event listeners for the role and year selects
  document
    .getElementById("role-select")
    .addEventListener("change", updateDisplay);
  document
    .getElementById("year-select")
    .addEventListener("change", updateDisplay);

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

  switchProduce();
}

function switchProduce() {
  var selectedData =
    cachedProduceData[document.getElementById("produce-select").value];

  // default to producer view
  $("#role-option-producer").attr("selected", "true");

  // clear the old year select
  var yearSelect = document.getElementById("year-select");
  while (yearSelect.firstChild) {
    yearSelect.removeChild(yearSelect.firstChild);
  }

  // fill the year select with years
  selectedData["available_years"].forEach(function(year) {
    var option = document.createElement("option");
    option.innerHTML = year;
    if (year == 2016) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  });

  updateDisplay();
}

function updateDisplay() {
  var selectedRole = document.getElementById("role-select").value;
  var selectedProduce = document.getElementById("produce-select").value;
  var selectedYear = document.getElementById("year-select").value;
  var selectedData =
    cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
      selectedRole
    ];

  // redraw the bottom quantity axis
  d3.select("#quantity-axis").remove();
  quantityScale = d3
    .scaleLinear()
    .domain([
      0,
      cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
        "Producers"
      ]["production"][0] + 1
    ])
    .range([height - margin.bottom, margin.top]);

  var quantityAxis = produceSVG
    .append("g")
    .attr("id", "quantity-axis")
    .selectAll("quantity-axis-elements")
    .data(quantityScale.ticks())
    .enter();

  quantityAxis
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

  quantityAxis
    .append("text")
    .text(function(d, i) {
      const oneMillion = 1000000;
      return d / oneMillion + "M";
    })
    .attr("x", 0)
    .attr("y", function(d, i) {
      return quantityScale(d) - 10;
    });

  // redraw the country axis
  d3.select("#country-axis").remove();
  d3.selectAll(".country-label").remove();

  var countryScale = d3
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

  var countryAxis = produceSVG
    .append("g")
    .attr("id", "country-axis")
    .selectAll("country-axis-elements")
    .data(countryScale.domain())
    .enter()
    .append("line")
    .attr("x1", function(d, i) {
      return countryScale(d) - bar.width - bar.spacing;
    })
    .attr("y1", margin.top)
    .attr("x2", function(d, i) {
      // position the country label with popper
      var label = document.createElement("p");
      label.className = "country-label";
      label.innerHTML = d;
      new Popper(this, label, {
        placement: "top",
        positionFixed: true,
        modifiers: {
          preventOverflow: {
            enabled: false
          },
          hide: {
            enabled: false
          }
        }
      });

      // add a tooltip to the country label popper
      label.setAttribute("data-toggle", "tooltip");
      label.setAttribute("data-html", "true");
      label.setAttribute("data-placement", "left");
      $(label).attr("title", function() {
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

      document.getElementById("produce-poppers").appendChild(label);

      // return the x2 coordinate of the line
      return countryScale(d) + bar.width + bar.spacing + bar.width;
    })
    .attr("y2", margin.top)
    .attr("stroke", axis.color);

  // redraw the bars for production, import and export quantities (in that order)
  d3.select("#produce-bars").remove();
  var barChart = produceSVG
    .append("g")
    .attr("id", "produce-bars")
    .selectAll("bars")
    .data(selectedData["countries"])
    .enter();

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d) - bar.width - bar.spacing;
    })
    .attr("y", function(d, i) {
      return quantityScale(selectedData["production"][i]);
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return (
        height - margin.bottom - quantityScale(selectedData["production"][i])
      );
    })
    .attr("fill", bar.colors.production);

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d);
    })
    .attr("y", function(d, i) {
      return quantityScale(selectedData["import"][i]);
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return height - margin.bottom - quantityScale(selectedData["import"][i]);
    })
    .attr("fill", bar.colors.import);

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d) + bar.width + bar.spacing;
    })
    .attr("y", function(d, i) {
      return quantityScale(selectedData["export"][i]);
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return height - margin.bottom - quantityScale(selectedData["export"][i]);
    })
    .attr("fill", bar.colors.export);

  // set the max-width for all country label poppers
  $(".country-label").css("max-width", bar.width * 3 + bar.spacing * 2 + 20);

  // enable all tooltips
  $('[data-toggle="tooltip"]').tooltip();

  console.log(
    "Displaying " +
      selectedRole +
      " of " +
      selectedProduce +
      " in " +
      selectedYear
  );
}
