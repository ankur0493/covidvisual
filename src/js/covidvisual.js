(function($) {
  "use strict"; // Start of use strict

  // Toggle the side navigation
  $("#sidebarToggle, #sidebarToggleTop").on('click', function(e) {
    $("body").toggleClass("sidebar-toggled");
    $(".sidebar").toggleClass("toggled");
    if ($(".sidebar").hasClass("toggled")) {
      $('.sidebar .collapse').collapse('hide');
    };
  });

  // Close any open menu accordions when window is resized below 768px
  $(window).resize(function() {
    if ($(window).width() < 768) {
      $('.sidebar .collapse').collapse('hide');
    };
  });

  // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
  $('body.fixed-nav .sidebar').on('mousewheel DOMMouseScroll wheel', function(e) {
    if ($(window).width() > 768) {
      var e0 = e.originalEvent,
        delta = e0.wheelDelta || -e0.detail;
      this.scrollTop += (delta < 0 ? 1 : -1) * 30;
      e.preventDefault();
    }
  });

  // Scroll to top button appear
  $(document).on('scroll', function() {
    var scrollDistance = $(this).scrollTop();
    if (scrollDistance > 100) {
      $('.scroll-to-top').fadeIn();
    } else {
      $('.scroll-to-top').fadeOut();
    }
  });

  // Smooth scrolling using jQuery easing
  $(document).on('click', 'a.scroll-to-top', function(e) {
    var $anchor = $(this);
    $('html, body').stop().animate({
      scrollTop: ($($anchor.attr('href')).offset().top)
    }, 1000, 'easeInOutExpo');
    e.preventDefault();
  });

})(jQuery); // End of use strict

// set the dimensions and margins of the graph
var margin = ({top: 20, right: 40, bottom: 30, left: 50});
var height = 325, width = 650;
var timeParse = d3.timeParse("%Y-%m-%dT%H:%M:%S.%L%Z");

var plotChart = (data, divId, xVariable) => {
  var svg = d3.select(divId)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible");

  const svgBbox = svg.node().getBBox();

  var x = d3.scaleUtc()
      .domain(d3.extent(data, d => d.date))
      .range([svgBbox.x + margin.left, svgBbox.x + width - margin.right]);
  var y = d3.scaleLinear()
      .domain([0,d3.max(data, d => d[xVariable])]).nice()
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

  var hover = (svg, path) => {
    if ("ontouchstart" in document) svg
        .style("-webkit-tap-highlight-color", "transparent")
        .on("touchmove", moved)
        .on("mouseenter", entered)
        .on("mouseleave", left);
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
      const xm = x.invert(d3.mouse(svg.node())[0]);
      const i1 = d3.bisector(d => d.date).left(data, xm, 1);
      const i0 = i1 - 1;
      const i = xm - data[i0].date > data[i1].date - xm ? i1 : i0;
      const s = data[i];
      tooltip.attr("transform", `translate(${x(s.date)},${y(s[xVariable])})`);
      const value = `${s.date.toLocaleString(undefined, {month: "short", day: "numeric", year: "numeric"})}
  ${s[xVariable]}`
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
    .defined(d => !isNaN(d[xVariable]))
    .x(d => x(d.date))
    .y(d => y(d[xVariable]));

  var path = svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("d", line);

  svg.call(hover, path);
}

d3.json("../data/icmr/testing_data.json")
.then(data => {
  var dailyData = data.slice(1).map((d, i) => {
    return {
      date: timeParse(d.report_time),
      samples_tested: d.samples - data[i].samples}
    })
  plotChart(dailyData, "#covid-19-tests-daily", "samples_tested")
  var totalData = data.map((d, i) => {
    return {
      date: timeParse(d.report_time),
      samples_tested: d.samples}
    })
  plotChart(totalData, "#covid-19-tests", "samples_tested")
});

d3.json("../data/mohfw/national_confirmed_cases.json")
.then(data => {
  var latestData = data[data.length - 1];
  d3.select("#confirmed_count").text(latestData.total_confirmed_cases);
  d3.select("#active_count").text(latestData.active_cases);
  d3.select("#recovered_count").text(latestData.cured);
  d3.select("#deceased_count").text(latestData.death);
  return data
})
.then(data => data.filter(d => d.include_in_chart))
.then(data => d3.map(data, d => {return timeParse(d.record_time).setHours(0,0,0,0)}))
.then(map => {
  var totalData = map.values().map((d, i) => {
    return {
      date: timeParse(d.record_time),
      total_confirmed: d.total_confirmed_cases}
  })
  plotChart(totalData, "#covid-19-cases", "total_confirmed")
  var dailyData = map.values().slice(1).map((d, i) => {
    return {
      date: timeParse(d.record_time),
      total_confirmed: d.total_confirmed_cases - map.values()[i].total_confirmed_cases}
  })
  plotChart(dailyData, "#covid-19-cases-daily", "total_confirmed")
})