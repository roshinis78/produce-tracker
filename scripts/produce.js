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
var width = $(".container").width();
const height = 600;
const margin = { top: 50, left: 70, bottom: 100, right: 50 };

const bar = {
  height: 10
};

var cachedProduceData = null;
var produceVisualization = null;

function visualizeProduce() {
  cachedProduceData = JSON.parse(sessionStorage.getItem("cachedProduceData"));

  // fill the produce select with produce
  var produceSelect = document.getElementById("produce-select");
  cachedProduceData["produce"].forEach(function(produce) {
    var option = document.createElement("option");
    option.innerHTML = produce;
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

  produceSVG = d3
    .select("#produce-analysis-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  var quantityScale = d3
    .scaleLinear()
    .domain([
      0,
      hundredMillionCeiling(cachedProduceData["largest_quantity"]) + 1
    ])
    .range([margin.left, width - margin.right]);

  produceSVG
    .append("g")
    .call(d3.axisBottom(quantityScale))
    .attr("transform", "translate(0, " + (height - margin.bottom) + ")");

  updateYearOptions();
}

function updateYearOptions() {
  var selectedProduce = document.getElementById("produce-select").value;
  var selectedData = cachedProduceData[selectedProduce];

  // clear the old year select
  var yearSelect = document.getElementById("year-select");
  while (yearSelect.firstChild) {
    yearSelect.removeChild(yearSelect.firstChild);
  }

  // fill the year select with years
  selectedData["available_years"].forEach(function(year) {
    var option = document.createElement("option");
    option.innerHTML = year;
    yearSelect.appendChild(option);
  });

  updateDisplay();
}

function updateDisplay() {
  var selectedRole = document.getElementById("role-select").value;
  var selectedProduce = document.getElementById("produce-select").value;
  var selectedYear = document.getElementById("year-select").value;

  // redraw the bottom country axis
  d3.select("#country-axis").remove();
  var top10Countries = [
    "",
    ...cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
      selectedRole
    ]["countries"],
    ""
  ];

  var countryScale = d3
    .scaleOrdinal()
    .domain(top10Countries)
    .range(
      d3.range(
        margin.top,
        height - margin.bottom,
        (height - margin.bottom - margin.top) / top10Countries.length
      )
    );

  produceSVG
    .append("g")
    .call(d3.axisLeft(countryScale))
    .attr("id", "country-axis")
    .attr("transform", "translate(" + margin.left + ",0)");

  // redraw the bars
  d3.select("#produce-bars").remove();
  var svg = produceSVG.append("g").attr("id", "produce-bars");
  svg
    .selectAll("bars")
    .data(
      cachedProduceData[selectedProduce]["top10_per_year"][selectedYear][
        selectedRole
      ]
    )
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", function(d, i) {
      return countryScale(d["countries"][i]);
    })
    .attr("width", function(d, i) {
      return quantityScale(d["production"][i]);
    })
    .attr("height", function(d, i) {});

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
