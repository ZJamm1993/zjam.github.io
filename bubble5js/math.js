let OBJ_BLOCK_WIDTH = 64.0;
let OBJ_BLOCK_SIZE = cc.size(OBJ_BLOCK_WIDTH, OBJ_BLOCK_WIDTH);
let OBJ_BLOCK_RECT = cc.rect(0, 0, OBJ_BLOCK_WIDTH, OBJ_BLOCK_WIDTH);

let M_PI = Math.PI;
let M_PI_2 = M_PI / 2;
let M_PI_3 = M_PI / 3;
let M_PI_4 = M_PI / 4;
let M_PI_6 = M_PI / 6;
let M_SQRT2 = sqrt(2);

function sin(radius) {
    return Math.sin(radius);
};

function cos(radius) {
    return Math.cos(radius);
};

function tan(radius) {
    return Math.tan(radius);
}

function atan2(y, x) {
    return Math.atan2(y, x);
}

function abs(x) {
    return Math.abs(x);
}

function sqrt(x) {
    return Math.sqrt(x);
}

var zz = zz || {};



// points 
zz.pointNotFound = function() {
    return cc.p(-100, -100);
};

zz.distanceFromPoints = function(p1, p2) {
    var dx = p1.x - p2.x;
    var dy = p1.y - p2.y;
    return sqrt((dx * dx) + (dy * dy));
};

zz.centerFromPoints = function(p1, p2) {
    return cc.p((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
};

zz.pointOffset = function(point, dx, dy) {
    return cc.p(point.x + dx, point.y + dy);
};

zz.pointRotateVector = function(vector, radius) {
    var x = vector.x * cos(radius) - vector.y * sin(radius);
    var y = vector.x * sin(radius) + vector.y * cos(radius);
    return cc.p(x, y);
};

zz.pointRotatePoint = function(targetPoint, originPoint, radius) {
    var tempVector = zz.pointOffset(targetPoint, -originPoint.x, -originPoint.y);
    var rotatedVector = zz.pointRotateVector(tempVector, radius);
    var newPoint = zz.pointOffset(rotatedVector, originPoint.x, originPoint.y);
    return newPoint;
};

// lines 
zz.line = function(x, y, alpha) {
    return {x: x, y: y, alpha:alpha};
};

zz.lineEqualToLine = function(line1, line2) {
    return line1.x == line2.x && line1.y == line2.y && line1.alpha == line2.alpha;
};

zz.rectInset = function(rect, dx, dy) {
    return cc.rect(rect.x + dx, rect.y + dy, rect.width - dx - dx, rect.height - dy - dy);
}

// intersetion

zz.rectIntersectsLine = function(rect, line) {
    var rectOrginPoint = cc.p(rect.x, rect.y);
    var rectDiagonalPoint = cc.p(rect.x + rect.width, rect.y + rect.height);

    var li1 = zz.line(rectOrginPoint.x, rectOrginPoint.y, 0);
    var li2 = zz.line(rectOrginPoint.x, rectOrginPoint.y, M_PI_2);
    var li3 = zz.line(rectDiagonalPoint.x, rectDiagonalPoint.y, 0);
    var li4 = zz.line(rectDiagonalPoint.x, rectDiagonalPoint.y, M_PI_2);

    var biggerRect = zz.rectInset(rect, -1, -1);

    var lines = new Array(li1, li2, li3, li4);

    for (let i in lines) {
        var tl = lines[i];
        var intersectPoint = zz.pointIntersectionFromLines(tl, line);
        if (cc.rectContainsPoint(biggerRect, intersectPoint)) {
            return true;
        }
    }
    return false;
}

zz.pointIntersectionFromLines = function(line1, line2) {
    var k1 = tan(line1.alpha);
    var k2 = tan(line2.alpha);

    if (k1 == k2) {
        return zz.pointNotFound();
    }

    var c1 = line1.y - k1 * line1.x;
    var c2 = line2.y - k2 * line2.x;

    var xValue = (c2 - c1) / (k1 - k2);
    var yValue = 0;
    if (abs(k1) > abs(k2)) {
        yValue = k2 * xValue + c2;
    } else {
        yValue = k1 * xValue + c1;
    }
    return cc.p(xValue, yValue);
};

zz.pointIntersectionFromRectToLine = function(rect, line) {
    var rectOrginPoint = cc.p(rect.x, rect.y);
    var rectDiagonalPoint = cc.p(rect.x + rect.width, rect.y + rect.height);

    var li1 = zz.line(rectOrginPoint.x, rectOrginPoint.y, 0);
    var li2 = zz.line(rectOrginPoint.x, rectOrginPoint.y, M_PI_2);
    var li3 = zz.line(rectDiagonalPoint.x, rectDiagonalPoint.y, 0);
    var li4 = zz.line(rectDiagonalPoint.x, rectDiagonalPoint.y, M_PI_2);

    var biggerRect = zz.rectInset(rect, -1, -1);
    var selectedPoint = zz.pointNotFound();
    var minDistance = 1000000;

    var lines = new Array(li1, li2, li3, li4);

    for (let i in lines) {
        var tl = lines[i];
        var intersectPoint = zz.pointIntersectionFromLines(tl, line);
        if (cc.rectContainsPoint(biggerRect, intersectPoint)) {
            var dist = zz.distanceFromPoints(cc.p(line.x, line.y), intersectPoint);
            var cosdx = (intersectPoint.x - line.x) / dist;
            var sindy = (intersectPoint.y - line.y) / dist;
            // 判断方向！！！ 填0有误差！！
            if (((cosdx * cos(line.alpha)) >= -0.1) && ((sindy * sin(line.alpha)) >= -0.1)) {
                if (dist < minDistance) {
                    minDistance = dist;
                    selectedPoint = intersectPoint;
                }
            }
        }
    }
    // return selectedPoint;

    if (!cc.pointEqualToPoint(selectedPoint, zz.pointNotFound())) {
        var tolerance = 1.0;
        var testDistance = rect.width * 0.5 * M_SQRT2 - tolerance;
        var centerPoint = cc.p(cc.rectGetMidX(rect), cc.rectGetMidY(rect));
        // y = kx + b;
        var k = tan(line.alpha);
        if (k > 1000000) {
            if (abs(line.x - centerPoint.x) > testDistance) {
                selectedPoint = zz.pointNotFound();
            }
        } else {
            var b = line.y - k * line.x;
            // Ax + By + C = 0;
            var A = k;
            var B = -1;
            var C = b;
            var dis = abs(A * centerPoint.x + B * centerPoint.y + C) / sqrt(A * A + B * B);
            if (dis > testDistance) {
                selectedPoint = zz.pointNotFound();
            }
        }
    }

    return selectedPoint;
};
