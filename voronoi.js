


var g = {
	c  			: undefined,
	w  			: 0,
	h  			: 0,
	alpha 		: "0.2",
	vd 			: undefined,
	custom_pts 	: []
};

// Visual functions

function clear_canvas() {
	g.c.clearRect(-2000,-2000,4000,4000);
}

function draw_triangulation() {

	// Visualizes the Delaunay triangulation
	// of VoronoiDiagram g.vd.

	g.c.save();
	g.c.strokeStyle = "red";
	g.c.lineWidth = "3";
	g.c.lineJoin = "round";
	g.c.fillStyle = "yellow";
	g.c.globalAlpha = g.alpha;

	$.each(g.vd.triangulation(), function(i, t) {
		t.fill(g.c);
		t.draw(g.c);
	});

	g.c.restore();
}

function draw_edges() {

	// Visualizes the EdgeIndex
	// of VoronoiDiagram g.vd.

	g.vd.ei.foreach(function(e) {
		e.draw(g.c);
	});
}

function draw_cells() {

	// Visualizes the cells of
	// VoronoiDiagram g.vd.

	g.c.save();

	// Loop over cells

	$.each(g.vd.cells(), function(i, vc) {
		g.c.beginPath();

		// Create path of cell edge

		for (var i=0; i<vc.vertices.length; i++) {
			if (i>0) {
				g.c.lineTo(vc.vertices[i].x, vc.vertices[i].y);	}
			else {
				g.c.moveTo(vc.vertices[0].x, vc.vertices[0].y); }
		}

		// Draw strong thin edges

		g.c.strokeStyle = "green";
		g.c.lineWidth = "3";
		g.c.globalAlpha = "1";
		g.c.stroke();

		// Draw light wide edges

		g.c.strokeStyle = "blue";
		g.c.lineWidth = "10";
		g.c.globalAlpha = g.alpha;
		g.c.fillStyle = ["yellow", "red", "green", "blue"][Math.floor(Math.random()*4)];
		g.c.fill();
		g.c.stroke();

		// Draw center point

		g.c.globalAlpha = "1";
		g.c.fillStyle = "rgb(220,0,0)";
		vc.center.draw(g.c, 4);
	});

	g.c.restore();
}

// Parameter checking

function check_param_bounds(p) {

	// Given an array of arrays in the form of
	// [[element-id, min-val, max-val], ...]
	// checks the values of specified input fields,
	// clamps them and updates the UI if necessary.
	//
	// If a string is passed as an element of p, the
	// value of the field with the same name is copied
	// to the return structure as-is; a boolean value in
	// case of checkboxes.
	//
	// Returns an object with parameter names as fields.

	var r = {};

	for (var i=0; i<p.length; i++) {
		var el;
		var v;

		// !array

		if (!(p[i] instanceof Array)) {
			el = $("#" + p[i]);
			if (!(el.length)) continue;

			if (el.attr("type") == "checkbox") {
				r[p[i]] = el.is(":checked"); }
			else {
				r[p[i]] = el.val(); }
		}

		// array

		el = $("#" + p[i][0]);
		v = el.val();
		if (!(el.length)) continue;

		if (isNaN(v))
			el.val(p[i][1]);
		else if (v < p[i][1])
			el.val(p[i][1]);
		else if (v > p[i][2])
			el.val(p[i][2]);

		r[p[i][0]] = el.val();
	}

	return r;
}

// Main entry points

$(document).ready(function() {
	var canvas = document.getElementById("thecanvas");
	g.c = canvas.getContext("2d");

	$(canvas).click(function(e) {
		var x = e.pageX - canvas.offsetLeft;
		var y = e.pageY - canvas.offsetTop;
		var p = new Point(x, y);

		if (g.custom_pts.length == 0) {
			clear_canvas();
			$('#n').attr("disabled", "disabled");
		}

		g.custom_pts.push(p);

		g.c.globalAlpha = "1";
		g.c.fillStyle = "rgb(220,0,0)";
		p.draw(g.c, 4);
	});

});

function generate() {
	var points = [];
	var param;

	// Check and gather parameters

	param = check_param_bounds([
		"b_delaunay",
		"b_voronoi",
		"b_dt_on_top",
		["n",      3, 100],
		["alpha",  0, 1],
		["width",  100, 4000],
		["height", 100, 4000]
	]);

	// Init environment

	g.w = param.width;
	g.h = param.height;
	g.alpha = param.alpha;

	$("#thecanvas")
		.attr("width", g.w)
		.attr("height", g.h);

	if (!param.b_voronoi && !param.b_delaunay) {
		param.b_voronoi = true;
		$("#b_voronoi").attr("checked", "checked");
	}

	// Generate the Voronoi diagram

	if (g.custom_pts.length) {
		points = g.custom_pts;
		if (points.length < 3) {
			alert("Please specify at least 3 points");
			reset();
			return;
		}
	}
	else {
		for (i=0; i<param.n; i++) {
			var x = Math.round(Math.random() * g.w);
			var y = Math.round(Math.random() * g.h);
			var p = new Point(x, y);
			points.push(p);
		}
	}

	g.vd = new VoronoiDiagram(g.w, g.h, points);

	// Visualize

	clear_canvas();
	if (param.b_delaunay && !param.b_dt_on_top) draw_triangulation();
	if (param.b_voronoi) draw_cells();
	if (param.b_delaunay && param.b_dt_on_top) draw_triangulation();

	g.custom_pts = [];
	$('#n').removeAttr("disabled");
};

function reset() {
	$('#theform').get(0).reset();
	$('#n').removeAttr("disabled");
	clear_canvas();
	g.custom_pts = [];
}

