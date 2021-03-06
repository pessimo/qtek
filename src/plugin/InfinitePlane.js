import Mesh from '../Mesh';
import StaticGeometry from '../StaticGeometry';
import Plane from '../math/Plane';
import Vector3 from '../math/Vector3';
import Matrix4 from '../math/Matrix4';
import Ray from '../math/Ray';

import glMatrix from '../dep/glmatrix';
var mat4 = glMatrix.mat4;
var vec3 = glMatrix.vec3;
var vec4 = glMatrix.vec4;

var uvs = [[0, 0], [0, 1], [1, 1], [1, 0]];
var tris = [0, 1, 2, 2, 3, 0];

var InfinitePlane = Mesh.extend({

    camera: null,

    plane: null,

    maxGrid: 0,

    // TODO
    frustumCulling: false

}, function () {
    var geometry = this.geometry = new StaticGeometry({
        dynamic: true
    });
    geometry.attributes.position.init(6);
    geometry.attributes.normal.init(6);
    geometry.attributes.texcoord0.init(6);
    geometry.indices = new Uint16Array(6);

    this.plane = new Plane();
}, {

    updateGeometry: function () {

        var coords = this._unProjectGrid();
        if (!coords) {
            return;
        }
        var positionAttr = this.geometry.attributes.position;
        var normalAttr = this.geometry.attributes.normal;
        var texcoords = this.geometry.attributes.texcoord0;
        var indices = this.geometry.indices;

        for (var i = 0; i < 6; i++) {
            var idx = tris[i];
            positionAttr.set(i, coords[idx]._array);
            normalAttr.set(i, this.plane.normal._array);
            texcoords.set(i, uvs[idx]);
            indices[i] = i;
        }
        this.geometry.dirty();
    },

    // http://fileadmin.cs.lth.se/graphics/theses/projects/projgrid/
    _unProjectGrid: (function () {

        var planeViewSpace = new Plane();
        var lines = [
            0, 1, 0, 2, 1, 3, 2, 3,
            4, 5, 4, 6, 5, 7, 6, 7,
            0, 4, 1, 5, 2, 6, 3, 7
        ];

        var start = new Vector3();
        var end = new Vector3();

        var points = [];

        // 1----2
        // |    |
        // 0----3
        var coords = [];
        for (var i = 0; i < 4; i++) {
            coords[i] = new Vector3(0, 0);
        }

        var ray = new Ray();

        return function () {
            planeViewSpace.copy(this.plane);
            planeViewSpace.applyTransform(this.camera.viewMatrix);

            var frustumVertices = this.camera.frustum.vertices;

            var nPoints = 0;
            // Intersect with lines of frustum
            for (var i = 0; i < 12; i++) {
                start._array = frustumVertices[lines[i * 2]];
                end._array = frustumVertices[lines[i * 2 + 1]];

                var point = planeViewSpace.intersectLine(start, end, points[nPoints]);
                if (point) {
                    if (!points[nPoints]) {
                        points[nPoints] = point;
                    }
                    nPoints++;
                }
            }
            if (nPoints === 0) {
                return;
            }
            for (var i = 0; i < nPoints; i++) {
                points[i].applyProjection(this.camera.projectionMatrix);
            }
            var minX = points[0]._array[0];
            var minY = points[0]._array[1];
            var maxX = points[0]._array[0];
            var maxY = points[0]._array[1];
            for (var i = 1; i < nPoints; i++) {
                maxX = Math.max(maxX, points[i]._array[0]);
                maxY = Math.max(maxY, points[i]._array[1]);
                minX = Math.min(minX, points[i]._array[0]);
                minY = Math.min(minY, points[i]._array[1]);
            }
            if (minX == maxX || minY == maxY) {
                return;
            }
            coords[0]._array[0] = minX;
            coords[0]._array[1] = minY;
            coords[1]._array[0] = minX;
            coords[1]._array[1] = maxY;
            coords[2]._array[0] = maxX;
            coords[2]._array[1] = maxY;
            coords[3]._array[0] = maxX;
            coords[3]._array[1] = minY;

            for (var i = 0; i < 4; i++) {
                this.camera.castRay(coords[i], ray);
                ray.intersectPlane(this.plane, coords[i]);
            }

            return coords;
        };
    })()
});

export default InfinitePlane;
