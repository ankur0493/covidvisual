var stateDataDateFormat = "%d %B %Y, %H:%M"
var dateParseStateData = inputDate => {
  var inputDate = inputDate.split(" GMT+5:30")[0];
  var dateParse = d3.timeParse(stateDataDateFormat);
  return dateParse(inputDate);
};
var dateFormatStateData = date => {
  return d3.timeFormat(stateDataDateFormat)(date) + " GMT+5:30";
}

d3.json("../data/mohfw/state_data.json")
.then(data => {
  var dates = d3.keys(data).map(d => {return dateParseStateData(d)});
  console.log(dates);
  var maxDate = d3.max(d3.values(dates));
  console.log(maxDate);
  return data[dateFormatStateData(maxDate)];
})
.then(data => {
  console.log(data);
  var columnNames = ["State/UT", "Confirmed", "Active", "Recovered", "Deceased"]
  var table = d3.select("#state-statistics")
                .append("table")
                .attr("class", "table table-hover table-sm table-responsive");
  table.append("thead")
    .append("tr")
      .selectAll("th")
      .data(columnNames)
      .enter()
    .append("th")
      .attr("class", "scope='col'")
      .text(function (columnNames) { return columnNames; });
  var tbody = table.append("tbody")
  var rows = tbody.selectAll("tr")
      .data(data)
      .enter()
      .append("tr");

  // create a cell in each row for each column
  var cells = rows.selectAll("td")
    .data(function (row) {
      return [row.state, row.total_confirmed, row.total_confirmed - row.total_cured - row.total_death, row.total_cured, row.total_death]
    })
      .enter()
    .append("td")
      .html(function (d) { return(d); });
})