
// The classes of main geometric data structures for
// Delaunay triangulation and Voronoi diagrams.

// Point class

function Point(x,y) {
	this.x = Math.floor(x);
	this.y = Math.floor(y);
}

Point.prototype.equals = function(p) {
	if (p.x == this.x && p.y == this.y)
		return true;
	return false;
}

Point.prototype.distance = function(p) {
	return Math.sqrt(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2));
}

Point.prototype.draw = function(c, r) {

	// c is the 2d context of canvas

	if (r == undefined || r == null)
		r = 2;

	c.beginPath();
	c.arc(this.x, this.y, r, 0, 6, 0);
	c.fill();
}

Point.prototype.draw_to = function(c, p) {

	// c is the 2d context of canvas

	c.beginPath();
	c.moveTo(this.x, this.y);
	c.lineTo(p.x, p.y);
	c.stroke();
}

// Edge class

function Edge(a, b, m, n) {

	// Edge class, a and b are Points;
	// m and n are Triangles, n can be null or undef

	//if (!(m instanceof Triangle))
	//	throw new Error("Edge constructor expects Triangles");
	if (!(n && n instanceof Triangle))
		n = null;

	this.a = a;
	this.b = b;
	this.m = m;
	this.n = n;
}

Edge.prototype.equals = function(e) {
	if (
		(this.a.equals(e.a) && this.b.equals(e.b)) ||
		(this.a.equals(e.b) && this.b.equals(e.a))
	) return true;
	return false;
}

Edge.prototype.n_triangles = function() {
	var n = 0;
	if (this.m) n++;
	if (this.n) n++;
	return n;
}

Edge.prototype.draw = function(c) {

	// c is the 2d context of canvas

	c.beginPath();
	c.moveTo(this.a.x, this.a.y);
	c.lineTo(this.b.x, this.b.y);
	c.stroke();
}

Edge.prototype.is_legal = function() {

	// Check whether edge is legal
	// in a Delaunay triangulation

	if (this.n_triangles() < 2)
		return true;

	var v1 = this.m.opposite_vertex(this);
	var v2 = this.n.opposite_vertex(this);

	var alpha =
		$V([this.a.x - v1.x, this.a.y - v1.y])
		.angleFrom($V([this.b.x - v1.x, this.b.y - v1.y]));
	var gamma =
		$V([this.a.x - v2.x, this.a.y - v2.y])
		.angleFrom($V([this.b.x - v2.x, this.b.y - v2.y]));

	if (alpha + gamma <= Math.PI) return true;
	return false;
}

Edge.prototype.flip = function() {

	// Flip edge. Invalidate both connected triangles, then
	// generate new legal triangles. Note that caller is
	// responsible for adding new triangles to the g.triangles
	// struct.

	if (this.n_triangles() != 2)
		throw new Error("Edge must connect two triangles to flip!");

	var oppvm = this.m.opposite_vertex(this);
	var oppvn = this.n.opposite_vertex(this);
	var a = this.m.a;
	var b = this.m.b;
	var c = this.m.c;
	var ei = this.m.ei;
	var nt1, nt2;

	this.m.invalidate();
	this.n.invalidate();

	if (oppvm.equals(a)) {
		nt1 = new Triangle(oppvm, oppvn, b, ei);
		nt2 = new Triangle(oppvm, oppvn, c, ei);
	}
	else if (oppvm.equals(b)) {
		nt1 = new Triangle(oppvm, oppvn, a, ei);
		nt2 = new Triangle(oppvm, oppvn, c, ei);
	}
	else if (oppvm.equals(c)) {
		nt1 = new Triangle(oppvm, oppvn, b, ei);
		nt2 = new Triangle(oppvm, oppvn, a, ei);
	}
	else {
		throw new Error("Unable to flip edge - cannot find opposite vertex for edge");
	}

	return ei.lookup(new Edge(oppvm, oppvn, nt1, nt2));
	//return new Edge(oppvm, oppvn, nt1, nt2);
}

// EdgeIndex class

function EdgeIndex() {
	this.ei = {};
}

EdgeIndex.prototype.supplement = function(e) {

	// If not present, insert Edge e into index;
	// else add a new triangle to its neighbors.
	// Fail if two triangles already present, or passed
	// edge has over one triangle.

	var minx = "" + Math.min(e.a.x, e.b.x);
	var miny = "" + Math.min(e.a.y, e.b.y);

	if (!this.ei[minx])
		this.ei[minx] = {};
	if (!this.ei[minx][miny])
		this.ei[minx][miny] = [];

	// Check for duplicate entry, supplement
	// edge with triangle

	var list = this.ei[minx][miny];

	for (i=0; i<list.length; i++) {
		var curre = list[i]; if (e.equals(curre)) {
			if (curre.n_triangles() != 1) {
				throw new Error("Can't supplement edge: n_triangles != 1 for target");
			}
			else if (e.n_triangles() != 1) {
				throw new Error("Can't supplement edge: n_triangles != 1 for source");
			}

			var sourcet = e.m || e.n;

			if (!curre.m) {
				curre.m = sourcet; }
			else {
				curre.n = sourcet; }
			return;
		}
	};

	// Insert new edge

	this.ei[minx][miny].push(e);
}

EdgeIndex.prototype.deprive = function(e, t) {

	// Deprive edge e of triangle t, if no triangles for
	// edge remain, remove it. Fail if edge not present.

	var olde = this.lookup(e);

	if (!olde)
		throw new Error("Passed edge not present for deprive()!");

	if (olde.m && olde.m.equals(t)) {
		olde.m = null; }
	else if (olde.n && olde.n.equals(t)) {
		olde.n = null; }

	if (olde.n_triangles() <= 0)
		this.remove(e);
}

EdgeIndex.prototype.lookup_list = function(e) {

	// For internal use: look up the list
	// of edges at index of current edge

	var minx = "" + Math.min(e.a.x, e.b.x);
	var miny = "" + Math.min(e.a.y, e.b.y);
	var list = this.ei[minx][miny] || [];

	for (i=0; i<list.length; i++) {
		if (e.equals(list[i])) return list;
	}

	//console.log("lookup_list() ret null", e);
	return null;
}

EdgeIndex.prototype.lookup = function(e) {

	// Return real edge from index (based on shallow equality) or
	// null if not present.

	var list = this.lookup_list(e);
	if (!list) return null;

	for (i=0; i<list.length; i++) {
		if (e.equals(list[i])) return list[i];
	}

	//console.log("lookup() ret null");
	return null;
}

EdgeIndex.prototype.remove = function(e) {

	// Remove edge from index, no questions asked

	var list = this.lookup_list(e);
	if (!list) return null;

	for (i=0; i<list.length; i++) {
		if (e.equals(list[i])) {
			list.splice(i, 1);
			return 1;
		}
	}

	return null;
}

EdgeIndex.prototype.foreach = function(fn) {

	// Execute function fn for every edge

	for (x in this.ei) {
		for (y in this.ei[x]) {
			var z=this.ei[x][y];
			for (i = 0; i<z.length; i++) {
				fn.apply(null, [z[i]]);
			}
		}
	}
}

// Triangle class

function Triangle(a, b, c, ei) {

	// Triangle class,
	// a, b and c are Points.
	// A triangle is always bound to the VoronoiDiagram's
	// EdgeIndex which must be supplied.

	this.a = a;
	this.b = b;
	this.c = c;
	this.ei = ei;

	ei.supplement(new Edge(a, b, this, null));
	ei.supplement(new Edge(b, c, this, null));
	ei.supplement(new Edge(c, a, this, null));
}

Triangle.prototype.equals = function(t) {

	if (!(t && t instanceof Triangle))
		return false;
	if (
		(this.a.equals(t.a) && this.b.equals(t.b) && this.c.equals(t.c)) ||
		(this.a.equals(t.b) && this.b.equals(t.c) && this.c.equals(t.a)) ||
		(this.a.equals(t.c) && this.b.equals(t.a) && this.c.equals(t.b)) ||
		(this.a.equals(t.a) && this.b.equals(t.c) && this.c.equals(t.b)) ||
		(this.a.equals(t.b) && this.b.equals(t.a) && this.c.equals(t.c)) ||
		(this.a.equals(t.c) && this.b.equals(t.b) && this.c.equals(t.a))
	) return true;

	return false;
}

Triangle.prototype.area = function() {
	var ab = $V([this.b.x - this.a.x, this.b.y - this.a.y, 0]);
	var ac = $V([this.c.x - this.a.x, this.c.y - this.a.y, 0]);

	var area = ab.dot(ab) * ac.dot(ac) - Math.pow(ab.dot(ac), 2);
	area = Math.sqrt(area) / 2;
	return area;
}

Triangle.prototype.draw = function(c) {

	// c is the 2d context of canvas

	c.beginPath();
	c.moveTo(this.a.x, this.a.y);
	c.lineTo(this.b.x, this.b.y);
	c.lineTo(this.c.x, this.c.y);
	c.lineTo(this.a.x, this.a.y);
	c.stroke();
}

Triangle.prototype.fill = function(c) {

	// c is the 2d context of canvas

	c.beginPath();
	c.moveTo(this.a.x, this.a.y);
	c.lineTo(this.b.x, this.b.y);
	c.lineTo(this.c.x, this.c.y);
	c.lineTo(this.a.x, this.a.y);
	c.fill();
}

Triangle.prototype.circumcenter = function() {

	// Returns the circumcenter of the triangle
	// as a Point.

	var a = this.a;
	var b = this.b;
	var c = this.c;

	var d = 2 * (a.y*c.x + b.y*a.x - b.y*c.x - a.y*b.x - c.y*a.x + c.y*b.x);

	var x = (
		b.y*Math.pow(a.x, 2) - c.y*Math.pow(a.x, 2) - Math.pow(b.y, 2)*a.y + Math.pow(c.y, 2)*a.y +
		Math.pow(b.x, 2)*c.y + Math.pow(a.y, 2)*b.y + Math.pow(c.x, 2)*a.y - Math.pow(c.y, 2)*b.y -
		Math.pow(c.x, 2)*b.y - Math.pow(b.x, 2)*a.y + Math.pow(b.y, 2)*c.y - Math.pow(a.y, 2)*c.y) / d;

	var y = (
		Math.pow(a.x, 2)*c.x + Math.pow(a.y, 2)*c.x + Math.pow(b.x, 2)*a.x - Math.pow(b.x, 2)*c.x +
		Math.pow(b.y, 2)*a.x - Math.pow(b.y, 2)*c.x - Math.pow(a.x, 2)*b.x - Math.pow(a.y, 2)*b.x -
		Math.pow(c.x, 2)*a.x + Math.pow(c.x, 2)*b.x - Math.pow(c.y, 2)*a.x + Math.pow(c.y, 2)*b.x) / d;

	return new Point(Math.round(x), Math.round(y));
}

Triangle.prototype.circ_contains = function(p) {

	// Returns true or false depending on whether
	// the circumcircle of triangle contains point p.

	var a = this.a.x - p.x;
	var b = this.a.y - p.y;
	var c = (Math.pow(this.a.x, 2) - Math.pow(p.x, 2)) + (Math.pow(this.a.y, 2) - Math.pow(p.y, 2));
	var d = this.b.x - p.x;
	var e = this.b.y - p.y;
	var f = (Math.pow(this.b.x, 2) - Math.pow(p.x, 2)) + (Math.pow(this.b.y, 2) - Math.pow(p.y, 2));
	var g = this.c.x - p.x;
	var h = this.c.y - p.y;
	var i = (Math.pow(this.c.x, 2) - Math.pow(p.x, 2)) + (Math.pow(this.c.y, 2) - Math.pow(p.y, 2));

	// Take the determinant

	var det = a*e*i - a*f*h - b*d*i + b*f*g + c*d*h - c*e*g;
	return det > 0;
}

Triangle.prototype.contains = function(p) {

	// Returns true or false depending on whether
	// Point p lies within Triangle t.
	//
	// (http://www.blackpawn.com/texts/pointinpoly/default.html)

	function sameside(p1, p2, a, b) {

		// Determine whether points p1 and p2 are on the
		// same side of the vector generated by points a and b

		var cp1 = $V([b.x - a.x, b.y - a.y, 0]).cross($V([p1.x - a.x, p1.y - a.y, 0]));
		var cp2 = $V([b.x - a.x, b.y - a.y, 0]).cross($V([p2.x - a.x, p2.y - a.y, 0]));
		var dp  = cp1.dot(cp2);

		if (dp >= 0) return true;
		return false;
	}

	if (
		this.area() &&
		sameside(p, this.a, this.b, this.c) &&
		sameside(p, this.b, this.a, this.c) &&
		sameside(p, this.c, this.a, this.b)
	) return true;
	return false;
}

Triangle.prototype.opposite_vertex = function(e) {

	// Find the opposite vertex to edge e.

	if ((this.a.equals(e.a) && this.b.equals(e.b)) || (this.a.equals(e.b) && this.b.equals(e.a)))
		return this.c;
	if ((this.b.equals(e.a) && this.c.equals(e.b)) || (this.b.equals(e.b) && this.c.equals(e.a)))
		return this.a;
	if ((this.c.equals(e.a) && this.a.equals(e.b)) || (this.c.equals(e.b) && this.a.equals(e.a)))
		return this.b;

	throw new Error("Edge is not part of triangle");
}

Triangle.prototype.smash = function(p) {

	// "Smash" the triangle into three pieces,
	// with Point p becoming the new vertex,
	// assumed to lay within the triangle.

	this.invalidate();

	return [
		new Triangle(this.a, this.b, p, this.ei),
		new Triangle(this.b, this.c, p, this.ei),
		new Triangle(this.c, this.a, p, this.ei),
	];
}

Triangle.prototype.invalidate = function() {

	// Invalidate triangle, in essence deleting it.
	// Every associated edge is deprived of triangle.

	this.ei.deprive(new Edge(this.a, this.b, this, null), this);
	this.ei.deprive(new Edge(this.b, this.c, this, null), this);
	this.ei.deprive(new Edge(this.c, this.a, this, null), this);
}

// VoronoiCell class

function VoronoiCell(p) {

	// p is the center of the cell (a Point).

	this.center = p;
	this.vertices = [];
	this.edges = [];
}

VoronoiCell.prototype.add_edge = function(e) {

	// Silently discard zero-length edges

	if (e.a.x == e.b.x && e.a.y == e.b.y)
		return;
	this.edges.push(e);
}

VoronoiCell.prototype.order = function(e) {

	// Order all edges into a list of vertices

	var e;
	var vs = this.vertices;
	var detected = false;

	e = this.edges.pop();
	this.vertices.push(e.a, e.b);

	// Loop over edges until none remain

	while (this.edges.length > 0) {
		detected = false;

		// Attempt to fit an edge onto the beginning or end
		// of the ordered list of vertices (the path)

		for (var i=0; i<this.edges.length; i++) {
			var n = vs.length;
			e = this.edges[i];

			if (vs[0].equals(e.a)) {
				vs.unshift(e.b); this.edges.splice(i, 1); detected = true; break;}
			else if (vs[0].equals(e.b)) {
				vs.unshift(e.a); this.edges.splice(i, 1); detected = true; break;}
			else if (vs[n-1].equals(e.a)) {
				vs.push(e.b); this.edges.splice(i, 1); detected = true; break;}
			else if (vs[n-1].equals(e.b)) {
				vs.push(e.a); this.edges.splice(i, 1); detected = true; break;}
		};

		// If no edges from the stack fit, an error
		// has occurred

		if (!detected) {
			throw new Error("Cannot order an edge for Voronoi cell");
		}
	}
}

// VoronoiDiagram class

VoronoiDiagram = function(w, h, points) {

	// w - width of canvas
	// h - height of canvas
	// points - an array of Points

	this.w = w;
	this.h = h;
	this.points = points;
	this.triangles = [];
	this.ei = new EdgeIndex();
	this.vcs = [];

	var rm = [];
	var vd = this;

	// Create supertriangle

	this.triangles.push(this.supertriangle());

	// Create Delaunay triangulation

	this.generate_delaunay();

	// Remove all edges connected to the original supertriangle,
	// and all associated triangles

	this.ei.foreach(function(e) {
		if (!(e.is_legal())) {
			throw new Error("One or more illegal edges present when all should be eliminated!");
		}
		if (e.a.x < 0 || e.a.x > vd.w || e.a.y < 0 || e.a.y > vd.h ||
			e.b.x < 0 || e.b.x > vd.w || e.b.y < 0 || e.b.y > vd.h) {
			rm.push(e);
		}
	});

	$.each(rm, function(i, e) {
		vd.remove_trs_with_edge(e);
		vd.ei.remove(e);
	});

	// Init Voronoi cells

	$.each(this.points, function(i, p) {
		vd.vcs.push(new VoronoiCell(p)); });

	// Add its edges to each Voronoi cell

	this.ei.foreach(function(e) {
		if (e.m && e.n) {
			var v1 = e.m.circumcenter();
			var v2 = e.n.circumcenter()

			$.each(vd.vcs, function(i, vc) {
				if (e.a.equals(vc.center) || e.b.equals(vc.center))
					vc.add_edge(new Edge(v1, v2));
			});
		}
	});

	// Order all VC edges into a list of vertices
	// to facilitate stroking a path around the sell

	$.each(vd.vcs, function(i, vc) {
		vc.order();
	});
}

VoronoiDiagram.prototype.supertriangle = function() {

	// Return the points of an equilateral supertriangle
	// encompassing the canvas as an array.

	var tan60 	= Math.tan(d2r(60));
	var a 		= this.w;
	var b		= this.h;
	var d 		= b / tan60;
	var f 		= (a * tan60) / 2;

	var scale = 3;

	return new Triangle(
		new Point(-d*scale, b*scale),
		new Point(a/2*scale, -f*scale),
		new Point(a+d*scale, b*scale),
		this.ei
	);
}

VoronoiDiagram.prototype.remove_trs_with_edge = function(e) {

	// Utility function to remove triangles with Edge e
	// from the global triangle list g.triangles.

	var rm = [];

	$.each(this.triangles, function(i, t) {
		if (t.equals(e.m) || t.equals(e.n)) {
			rm.push(i);
		} true;
	});

	if (rm[0] != undefined) {
		this.triangles.splice(rm[0], 1); }
	if (rm[1] != undefined) {
		this.triangles.splice(rm[1] - 1, 1); }
	if (rm[2] != undefined)
		throw new Error("Detected edge with >2 triangles!");
}

VoronoiDiagram.prototype.generate_delaunay = function() {

	var ps = [];
	for (var i=0; i<this.points.length; i++)
		ps.push(this.points[i]);

	while(ps.length) {
		var currp = ps.pop();
		var currt;

		// Determine current triangle

		for (var i=0; i<this.triangles.length; i++) {
			if (this.triangles[i].contains(currp)) {
				currt = this.triangles[i];
				this.triangles.splice(i, 1);
				break;
			}
		}

		// Smash up triangle

		var newtrs = currt.smash(currp);
		for (i=0; i<newtrs.length; i++) {
			this.triangles.push(newtrs[i]);
		}

		// Check for illegal edges, flip them if found.
		// Loop until none remain.

		var illegal_encountered = true;
		var lgpasses = 0;

		while(illegal_encountered) {
			illegal_encountered = false;
			var vd = this;

			this.ei.foreach(function(e) {
				if (!(e.is_legal())) {
					vd.remove_trs_with_edge(e);
					e = e.flip();
					vd.triangles.push(e.m);
					vd.triangles.push(e.n);

					illegal_encountered = true;
				}
			});

			lgpasses++;
		}

		//console.log("Legality check loops: " + lgpasses);
	}
}

VoronoiDiagram.prototype.triangulation = function() {
	return this.triangles;
}

VoronoiDiagram.prototype.cells = function() {
	return this.vcs;
}

// Aux fun

function d2r(d) {
	return d / 57.29577951308232;
}

function r2d(r) {
	return r / Math.PI * 180;
}




