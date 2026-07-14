using System;

namespace Domains.MathCore;

public class Point3D
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Z { get; set; }

    public Point3D(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }

    // Distance to another point
    public double DistanceToPoint(Point3D other)
    {
        return Math.Sqrt(Math.Pow(X - other.X, 2) + Math.Pow(Y - other.Y, 2) + Math.Pow(Z - other.Z, 2));
    }

    // Midpoint of the segment between two points
    public Point3D GetMidpoint(Point3D other)
    {
        return new Point3D((X + other.X) / 2, (Y + other.Y) / 2, (Z + other.Z) / 2);
    }

    // Point that divides the segment at the given ratio
    public Point3D GetPointAtRatio(Point3D other, double ratio)
    {
        return new Point3D(
            this.X + (other.X - this.X) * ratio,
            this.Y + (other.Y - this.Y) * ratio,
            this.Z + (other.Z - this.Z) * ratio
        );
    }

    // Centroid of the given points
    public static Point3D GetCentroid(params Point3D[] points)
    {
        if (points == null || points.Length == 0)
            throw new ArgumentException("Need at least one point.");

        double sumX = 0, sumY = 0, sumZ = 0;
        foreach (var p in points) { sumX += p.X; sumY += p.Y; sumZ += p.Z; }
        return new Point3D(sumX / points.Length, sumY / points.Length, sumZ / points.Length);
    }
 
    // Incenter of a triangle
    public static Point3D GetIncenter3(Point3D p1, Point3D p2, Point3D p3)
    {
        double a = p2.DistanceToPoint(p3);
        double b = p1.DistanceToPoint(p3);
        double c = p1.DistanceToPoint(p2);
 
        double sum = a + b + c;
        return new Point3D(
            (a * p1.X + b * p2.X + c * p3.X) / sum,
            (a * p1.Y + b * p2.Y + c * p3.Y) / sum,
            (a * p1.Z + b * p2.Z + c * p3.Z) / sum
        );
    }

    // Incenter for a triangle or arbitrary polygon
    public static (Point3D Center, double Radius, bool IsConsistent) GetIncenter(params Point3D[] points)
    {
        if (points == null || points.Length < 3) return (new Point3D(0, 0, 0), 0, false);

        if (points.Length == 3)
        {
            Point3D incenter = GetIncenter3(points[0], points[1], points[2]);
            double a = points[1].DistanceToPoint(points[2]);
            double b = points[0].DistanceToPoint(points[2]);
            double c = points[0].DistanceToPoint(points[1]);
            double p = (a + b + c) / 2;
            double area = GetTriangleArea(points[0], points[1], points[2]);
            double r = area / p;
            return (incenter, r, true); // A triangle always has an inscribed circle
        }

        // Polygon (4 or more vertices)
        var edges = new System.Collections.Generic.List<Line3D>();
        for (int i = 0; i < points.Length; i++)
        {
            var p1 = points[i];
            var p2 = points[(i + 1) % points.Length];
            edges.Add(new Line3D(p1, new Vector3D(p1, p2)));
        }

        var plane = new Plane3D(points[0], points[1], points[2]);
        var interiorPoint = GetCentroid(points); // Use the centroid as an interior reference point

        return GetIncenterPolygon(edges, plane, interiorPoint);
    }
 
    // Orthocenter of a triangle
    public static Point3D GetOrthocenter(Point3D p1, Point3D p2, Point3D p3)
    {
        // H = 3G - 2O (H: orthocenter, G: centroid, O: circumcenter)
        var g = GetCentroid(p1, p2, p3);
        var o = GetCircumcenter(p1, p2, p3);
 
        if (o == null) return g;

        return new Point3D(
            3 * g.X - 2 * o.X,
            3 * g.Y - 2 * o.Y,
            3 * g.Z - 2 * o.Z
        );
    }

    // Triangle area in 3D via the cross product
    public static double GetTriangleArea(Point3D p1, Point3D p2, Point3D p3)
    {
        var v1 = new Vector3D(p1, p2);
        var v2 = new Vector3D(p1, p3);
        // Area equals half the magnitude of the cross product
        return v1.CrossProduct(v2).Magnitude() / 2.0;
    }

    // Solve a 3x3 linear system using Cramer's rule
    private static Point3D? SolveLinearSystem3x3(double[,] A, double[] B)
    {
        double det = A[0,0] * (A[1,1] * A[2,2] - A[1,2] * A[2,1]) -
                    A[0,1] * (A[1,0] * A[2,2] - A[1,2] * A[2,0]) +
                    A[0,2] * (A[1,0] * A[2,1] - A[1,1] * A[2,0]);

        if (Math.Abs(det) < 1e-9) return null;

        double detX = B[0] * (A[1,1] * A[2,2] - A[1,2] * A[2,1]) -
                    A[0,1] * (B[1] * A[2,2] - A[1,2] * B[2]) +
                    A[0,2] * (B[1] * A[2,1] - A[1,1] * B[2]);

        double detY = A[0,0] * (B[1] * A[2,2] - A[1,2] * B[2]) -
                    B[0] * (A[1,0] * A[2,2] - A[1,2] * A[2,0]) +
                    A[0,2] * (A[1,0] * B[2] - B[1] * A[2,0]);

        double detZ = A[0,0] * (A[1,1] * B[2] - B[1] * A[2,1]) -
                    A[0,1] * (A[1,0] * B[2] - B[1] * A[2,0]) +
                    B[0] * (A[1,0] * A[2,1] - A[1,1] * A[2,0]);

        return new Point3D(detX / det, detY / det, detZ / det);
    }

    // Circumsphere or circumcircle center
    public static Point3D? GetCircumcenter(params Point3D[] pts)
    {
        if (pts.Length < 3) return null;
        
        Point3D p1 = pts[0];
        double[,] A = new double[3, 3];
        double[] B = new double[3];

        // Build the first two equations from P2 and P3: 2(Pi - P1)·I = ||Pi||² - ||P1||²
        for (int i = 0; i < 2; i++)
        {
            Point3D pi = pts[i + 1];
            A[i, 0] = 2 * (pi.X - p1.X);
            A[i, 1] = 2 * (pi.Y - p1.Y);
            A[i, 2] = 2 * (pi.Z - p1.Z);
            B[i] = (pi.X * pi.X + pi.Y * pi.Y + pi.Z * pi.Z) - (p1.X * p1.X + p1.Y * p1.Y + p1.Z * p1.Z);
        }

        if (pts.Length == 3)
        {
            // Circumcircle case (2D in 3D)
            // Third equation: I lies in the plane (P1P2P3), i.e. (I - P1)·Normal = 0
            var plane = new Plane3D(pts[0], pts[1], pts[2]); //
            A[2, 0] = plane.A;
            A[2, 1] = plane.B;
            A[2, 2] = plane.C;
            B[2] = -plane.D; // Because Ax + By + Cz + D = 0 implies Ax + By + Cz = -D
        }
        else
        {
            // Circumsphere case (3D)
            // Third equation from point P4
            Point3D p4 = pts[3];
            A[2, 0] = 2 * (p4.X - p1.X);
            A[2, 1] = 2 * (p4.Y - p1.Y);
            A[2, 2] = 2 * (p4.Z - p1.Z);
            B[2] = (p4.X * p4.X + p4.Y * p4.Y + p4.Z * p4.Z) - (p1.X * p1.X + p1.Y * p1.Y + p1.Z * p1.Z);
        }

        return SolveLinearSystem3x3(A, B); // Returns null if unsolvable (degenerate); no fallback to centroid
    }

    // Incenter of a polygon inscribed circle
    public static (Point3D Center, double Radius, bool IsConsistent) GetIncenterPolygon(List<Line3D> edges, Plane3D plane, Point3D interiorPoint)
    {
        // Steps 0-4: Normalize edges into in-plane normal vectors
        // Note: Must find vectors perpendicular to each edge that also lie in the plane
        var normalizedLines = new List<(Vector3D Normal, double D)>();
        foreach (var edge in edges)
        {
            // Edge normal = cross product of edge direction and plane normal
            var lineNormal = edge.Direction.CrossProduct(plane.Normal).Normalize();
            double d = -(lineNormal.X * edge.Point.X + lineNormal.Y * edge.Point.Y + lineNormal.Z * edge.Point.Z);

            // Step 3: Orient normals inward toward the polygon interior
            if (lineNormal.X * interiorPoint.X + lineNormal.Y * interiorPoint.Y + lineNormal.Z * interiorPoint.Z + d < 0)
            {
                lineNormal = lineNormal * -1; // Use overloaded * operator instead of a Multiply() call
                d = -d;
            }
            normalizedLines.Add((lineNormal, d));
        }

        // Steps 5-7: Build 3x3 system (two edge equations + plane equation)
        double[,] A = new double[3, 3];
        double[] B = new double[3];

        // Use the first two edges to eliminate r: (n2 - n1)·I = d1 - d2
        var l1 = normalizedLines[0];
        for (int i = 0; i < 2; i++)
        {
            var li = normalizedLines[i + 1];
            A[i, 0] = li.Normal.X - l1.Normal.X;
            A[i, 1] = li.Normal.Y - l1.Normal.Y;
            A[i, 2] = li.Normal.Z - l1.Normal.Z;
            B[i] = l1.D - li.D;
        }

        // Third equation: incenter I must lie in the polygon's plane
        A[2, 0] = plane.A; A[2, 1] = plane.B; A[2, 2] = plane.C;
        B[2] = -plane.D;

        // Steps 8-10: Solve and verify
        Point3D? incenter = SolveLinearSystem3x3(A, B);
        if (incenter == null) return (new Point3D(0,0,0), 0, false);

        double r = l1.Normal.X * incenter.X + l1.Normal.Y * incenter.Y + l1.Normal.Z * incenter.Z + l1.D;

        // Flag: verify consistency against all remaining edges
        bool isConsistent = true;
        foreach (var l in normalizedLines)
        {
            double dist = Math.Abs(l.Normal.X * incenter.X + l.Normal.Y * incenter.Y + l.Normal.Z * incenter.Z + l.D);
            if (Math.Abs(dist - r) > 1e-3) { isConsistent = false; break; }
        }

        return (incenter, r, isConsistent);
    }

    // Insphere center of a polyhedron
    public static (Point3D Center, double Radius, bool IsConsistent) GetInsphere(List<Plane3D> faces, Point3D interiorPoint)
    {
        // Steps 0-4: Normalize and orient all face planes inward
        var normalizedPlanes = new List<(Vector3D Normal, double D)>();
        foreach (var face in faces)
        {
            double mag = face.Normal.Magnitude();
            double a = face.A / mag;
            double b = face.B / mag;
            double c = face.C / mag;
            double d = face.D / mag;

            // Step 3: Ensure f(P) > 0 so normals point into the solid
            if (a * interiorPoint.X + b * interiorPoint.Y + c * interiorPoint.Z + d < 0)
            {
                a = -a; b = -b; c = -c; d = -d;
            }
            normalizedPlanes.Add((new Vector3D(a, b, c), d));
        }

        // Steps 5-7: Build the system eliminating r
        // Use the first face as reference: n1·I + d1 = r
        var p1 = normalizedPlanes[0];
        double[,] A = new double[3, 3];
        double[] B = new double[3];

        // Build three equations from the next three faces (i = 1, 2, 3)
        // Step 6 formula: (ni - n1)·I = d1 - di
        for (int i = 0; i < 3; i++)
        {
            var pi = normalizedPlanes[i + 1];
            A[i, 0] = pi.Normal.X - p1.Normal.X;
            A[i, 1] = pi.Normal.Y - p1.Normal.Y;
            A[i, 2] = pi.Normal.Z - p1.Normal.Z;
            B[i] = p1.D - pi.D;
        }

        // Step 8: Solve for center I(x, y, z)
        Point3D? incenter = SolveLinearSystem3x3(A, B);
        if (incenter == null) return (new Point3D(0,0,0), 0, false);

        // Step 9: Compute radius r from the reference face
        double r = p1.Normal.X * incenter.X + p1.Normal.Y * incenter.Y + p1.Normal.Z * incenter.Z + p1.D;

        // Step 10: Verify consistency (flagging step)
        bool isConsistent = true;
        foreach (var p in normalizedPlanes)
        {
            double dist = Math.Abs(p.Normal.X * incenter.X + p.Normal.Y * incenter.Y + p.Normal.Z * incenter.Z + p.D);
            if (Math.Abs(dist - r) > 1e-3) // Allowed tolerance
            {
                isConsistent = false;
                break;
            }
        }

        return (incenter, r, isConsistent);
    }

    // String representation of point coordinates
    public override string ToString()
    {
        return $"({X:F2}, {Y:F2}, {Z:F2})"; // Format: (0.00, 0.00, 0.00)
    }
}
