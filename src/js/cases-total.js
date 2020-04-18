// set the dimensions and margins of the graph
var margin = ({top: 20, right: 40, bottom: 30, left: 50});
var height=325, width=650;

var dates = new Array();
d3.json("https://raw.githubusercontent.com/ankur0493/covidvisual/master/mohfw/national_confirmed_cases.json")
.then(data => d3.map(data, function(d){return d3.timeParse("%Y-%m-%dT%H:%M:%S.%L%Z")(d.date).setHours(0,0,0,0)}))
.then(map => map.values().map(function(d, i){return {date:d3.timeParse("%Y-%m-%dT%H:%M:%S.%L%Z")(d.date), total_confirmed: d.total_confirmed}}))
.then(function(data){
  var svg = d3.select("#covid-19-cases")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible");

  const svgBbox = svg.node().getBBox();

  var x = d3.scaleUtc()
      .domain(d3.extent(data, d => d.date))
      .range([svgBbox.x + margin.left, svgBbox.x + width - margin.right]);
  var y = d3.scaleLinear()
      .domain([0,d3.max(data, d => d.total_confirmed)]).nice()
      .range([height - margin.bottom, margin.top]);

  var yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(null, "s"))
      .call(g => g.select(".domain").remove())
      .call(g => g.select(".tick:last-of-type text").clone()
          .attr("x", 3)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold"));
  var xAxis = g => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  function hover(svg, path) {
    
    if ("ontouchstart" in document) svg
        .style("-webkit-tap-highlight-color", "transparent")
        .on("touchmove", moved)
        .on("touchenter", entered)
        .on("touchleave", left);
    else svg
        .on("mousemove", moved)
        .on("mouseenter", entered)
        .on("mouseleave", left);
    
    const tooltip = svg.append("g")
        .attr("display", "none")
        .style("font", "10px sans-serif");

    const tooltipPath = tooltip.selectAll("path")
      .data([null])
      .join("path")
        .attr("fill", "white")
        .attr("stroke", "black");
    
    function moved() {
      d3.event.preventDefault();
      const ym = y.invert(d3.event.layerY);
      const xm = x.invert(d3.event.layerX);
      const i1 = d3.bisector(d => d.date).left(data, xm, 1);
      const i0 = i1 - 1;
      const i = xm - data[i0].date > data[i1].date - xm ? i1 : i0;
      const s = data[i];
      tooltip.attr("transform", `translate(${x(s.date)},${y(s.total_confirmed)})`);
      const value = `${s.date.toLocaleString(undefined, {month: "short", day: "numeric", year: "numeric"})}
  ${s.total_confirmed}`
      const text = tooltip.selectAll("text")
        .data([null])
        .join("text")
        .call(text => text
          .selectAll("tspan")
          .data((value + "").split(/\n/))
          .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i) => `${i * 1.1}em`)
            .style("font-weight", (_, i) => i ? null : "bold")
            .text(d => d));
      const bbox = text.node().getBBox();
      text.attr("transform", `translate(${-bbox.width / 2},${15 - bbox.y})`);
      tooltipPath.attr("d", `M${-bbox.width / 2 - 10},5H-5l5,-5l5,5H${bbox.width / 2 + 10}v${bbox.height + 20}h-${bbox.width + 20}z`);
    }

    function entered() {
      tooltip.attr("display", null);
    }

    function left() {
      tooltip.attr("display", "none");
    }
  }

  svg.append("g")
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  var line = d3.line()
    .defined(d => !isNaN(d.total_confirmed))
    .x(d => x(d.date))
    .y(d => y(d.total_confirmed));

  var path = svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("d", line);

  svg.call(hover, path);
});