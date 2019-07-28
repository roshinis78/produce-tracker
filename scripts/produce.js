$(document).ready(function() {
  // if the data has not been fetched, fetch and cache it
  if (sessionStorage.getItem("cachedProduceData") == null) {
    d3.json("data/top10_imp_exp_prod.json").then(function(data) {
      sessionStorage.setItem("cachedProduceData", JSON.stringify(data));
    });
  }

  visualizeProduce();
});

// Visualization constants and variables
var width = $(".row").width();
console.log(width);
const height = 600;
const margin = { top: 0, left: 100, bottom: 40, right: 10 };

const bar = {
  width: 20,
  spacing: 5,
  colors: {
    production: "#f77189",
    import: "#50b131",
    export: "#3ba3ec"
  }
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
    if (produce == "Maize") {
      option.selected = true;
    }
    produceSelect.appendChild(option);
  });

  // add an event listener for the produce select
  produceSelect.addEventListener("change", updateYearOptions);

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

  updateYearOptions();
}

function updateYearOptions() {
  var selectedData =
    cachedProduceData[document.getElementById("produce-select").value];

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

  produceSVG
    .append("g")
    .call(d3.axisLeft(quantityScale))
    .attr("id", "quantity-axis")
    .attr("transform", "translate(" + margin.left + ",0)");

  // redraw the country axis
  d3.select("#country-axis").remove();
  var top10Countries = [
    "",
    ...cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
      selectedRole
    ]["countries"]
  ];

  var countryScale = d3
    .scaleOrdinal()
    .domain(top10Countries)
    .range(
      d3.range(
        margin.left,
        width - margin.right,
        (width - margin.right - margin.left) / top10Countries.length
      )
    );

  produceSVG
    .append("g")
    .call(d3.axisBottom(countryScale))
    .attr("id", "country-axis")
    .attr("transform", "translate(0, " + (height - margin.bottom) + ")");

  // redraw the bars
  d3.select("#produce-bars").remove();
  var barChart = produceSVG
    .append("g")
    .attr("id", "produce-bars")
    .selectAll("bars")
    .data(
      cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
        selectedRole
      ]["countries"]
    )
    .enter();

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d) - bar.width - bar.spacing;
    })
    .attr("y", function(d, i) {
      return quantityScale(
        cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
          selectedRole
        ]["production"][i]
      );
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return (
        height -
        margin.bottom -
        quantityScale(
          cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
            selectedRole
          ]["production"][i]
        )
      );
    })
    .attr("fill", bar.colors.production);

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d);
    })
    .attr("y", function(d, i) {
      return quantityScale(
        cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
          selectedRole
        ]["import"][i]
      );
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return (
        height -
        margin.bottom -
        quantityScale(
          cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
            selectedRole
          ]["import"][i]
        )
      );
    })
    .attr("fill", bar.colors.import);

  barChart
    .append("rect")
    .attr("x", function(d, i) {
      return countryScale(d) + bar.width + bar.spacing;
    })
    .attr("y", function(d, i) {
      return quantityScale(
        cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
          selectedRole
        ]["export"][i]
      );
    })
    .attr("width", bar.width)
    .attr("height", function(d, i) {
      return (
        height -
        margin.bottom -
        quantityScale(
          cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
            selectedRole
          ]["export"][i]
        )
      );
    })
    .attr("fill", bar.colors.export);

  console.log(
    "Displaying " +
      selectedRole +
      " of " +
      selectedProduce +
      " in " +
      selectedYear
  );
}

/*****************************************************************************************/
/* HELPER FUNCTIONS */
// helper function used in visualizeProduce to calculate the quantity axis range maximum
function hundredMillionCeiling(number) {
  const hundredMillion = 100000000;
  if (number % hundredMillion != 0) {
    return (Math.floor(number / hundredMillion) + 1) * hundredMillion;
  }
  return number;
}
