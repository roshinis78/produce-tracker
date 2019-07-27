$(document).ready(function() {
  d3.json("data/top10_imp_exp_prod.json").then(function(data) {
    // print data for debugging
    console.log(JSON.stringify(data));

    // visualize data
    visualizeProduce(data);
  });
});

function visualizeProduce(data) {
  console.log("Get data COMPLETE! TAKE A BREAK!");
  console.log(data["Leeks, other alliaceous vegetables"]["available_years"]);
}
