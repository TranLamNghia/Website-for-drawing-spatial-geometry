using System.Globalization;
using System.Data;
using System.Text.RegularExpressions;
using Application.Compilers;
using Application.DTOs.Enums;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

internal static class FactGeometryHelper
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);

    public static List<string> ParseVertices(string expr)
    {
        if (string.IsNullOrWhiteSpace(expr)) return [];
        return VertexRegex.Matches(expr)
            .Cast<Match>()
            .Select(m => m.Value)
            .ToList();
    }

    public static List<Point3D> GetPoints(CompilationContext context, string expr)
    {
        var vertices = ParseVertices(expr);
        var points = new List<Point3D>();
        foreach (var v in vertices)
        {
            var p = context.GetPoint(v);
            if (p != null) points.Add(p);
        }
        return points;
    }

    public static double EvaluateExpression(string expr, double a)
    {
        try
        {
            string sanitized = (expr ?? string.Empty).ToLower().Replace(" ", "");
            sanitized = Regex.Replace(sanitized, @"(\d)a", "$1*a");

            while (sanitized.Contains("sqrt("))
            {
                int start = sanitized.IndexOf("sqrt(");
                int end = FindClosingParen(sanitized, start + 4);
                if (end == -1) break;
                string inside = sanitized.Substring(start + 5, end - (start + 5));
                double insideVal = EvaluateExpression(inside, a);
                sanitized = sanitized.Substring(0, start) +
                            Math.Sqrt(insideVal).ToString(CultureInfo.InvariantCulture) +
                            sanitized.Substring(end + 1);
            }

            sanitized = sanitized.Replace("a", a.ToString(CultureInfo.InvariantCulture));
            var dt = new DataTable();
            return Convert.ToDouble(dt.Compute(sanitized, ""), CultureInfo.InvariantCulture);
        }
        catch
        {
            return a;
        }
    }

    public static double PolygonPerimeter(IReadOnlyList<Point3D> points)
    {
        if (points.Count < 2) return 0;
        double total = 0;
        for (int i = 0; i < points.Count; i++)
        {
            total += points[i].DistanceToPoint(points[(i + 1) % points.Count]);
        }
        return total;
    }

    public static double PolygonArea(IReadOnlyList<Point3D> points)
    {
        if (points.Count < 3) return 0;
        double area = 0;
        for (int i = 1; i < points.Count - 1; i++)
        {
            area += Point3D.GetTriangleArea(points[0], points[i], points[i + 1]);
        }
        return area;
    }

    public static double PointToLineDistance(Point3D point, Point3D lineA, Point3D lineB)
    {
        var line = new Vector3D(lineA, lineB);
        var ap = new Vector3D(lineA, point);
        var cross = line.CrossProduct(ap);
        var denom = line.Magnitude();
        if (denom < 1e-12) return point.DistanceToPoint(lineA);
        return cross.Magnitude() / denom;
    }

    public static double MaxDistanceToPlane(IReadOnlyList<Point3D> points)
    {
        if (points.Count < 4) return 0;
        var plane = TryCreatePlane(points);
        if (plane == null) return 0;
        double max = 0;
        foreach (var point in points.Skip(3))
        {
            max = Math.Max(max, plane.DistanceToPoint(point));
        }
        return max;
    }

    public static bool AreCollinear(IReadOnlyList<Point3D> points, double epsilon = 1e-4)
    {
        if (points.Count < 3) return true;
        var p1 = points[0];
        var p2 = points[1];
        for (int i = 2; i < points.Count; i++)
        {
            var u = new Vector3D(p1, p2);
            var v = new Vector3D(p1, points[i]);
            if (u.CrossProduct(v).Magnitude() > epsilon) return false;
        }
        return true;
    }

    public static bool AreCoplanar(IReadOnlyList<Point3D> points, double epsilon = 1e-4)
    {
        if (points.Count < 4) return true;
        var plane = TryCreatePlane(points);
        if (plane == null) return true;
        foreach (var point in points.Skip(3))
        {
            if (plane.DistanceToPoint(point) > epsilon) return false;
        }
        return true;
    }

    public static double TetrahedronVolume(Point3D a, Point3D b, Point3D c, Point3D d)
    {
        var ab = new Vector3D(a, b);
        var ac = new Vector3D(a, c);
        var ad = new Vector3D(a, d);
        return Math.Abs(ab.DotProduct(ac.CrossProduct(ad))) / 6.0;
    }

    public static double PyramidVolume(IReadOnlyList<Point3D> points)
    {
        if (points.Count < 4) return 0;
        var apex = points[0];
        var basePts = points.Skip(1).ToList();
        if (basePts.Count < 3) return 0;
        var plane = TryCreatePlane(basePts);
        if (plane == null) return 0;
        var height = plane.DistanceToPoint(apex);
        var baseArea = PolygonArea(basePts);
        return baseArea * height / 3.0;
    }

    public static double PrismVolume(IReadOnlyList<Point3D> basePts, IReadOnlyList<Point3D> topPts)
    {
        if (basePts.Count < 3 || topPts.Count < 3) return 0;
        var plane = TryCreatePlane(basePts);
        if (plane == null) return 0;
        var height = plane.DistanceToPoint(topPts[0]);
        var baseArea = PolygonArea(basePts);
        return baseArea * height;
    }

    public static double SphereVolume(double radius) => (4.0 / 3.0) * Math.PI * Math.Pow(radius, 3);

    public static double CylinderVolume(double radius, double height) => Math.PI * radius * radius * Math.Abs(height);

    public static double ConeVolume(double radius, double height) => (Math.PI * radius * radius * Math.Abs(height)) / 3.0;

    public static ShapeType NormalizeShape(ShapeType shape)
    {
        return shape switch
        {
            ShapeType.Regular_cube => ShapeType.Cube,
            ShapeType.Regular_rectangular_cuboid => ShapeType.Rectangular_cuboid,
            ShapeType.Regular_parallelepiped => ShapeType.Parallelepiped,
            ShapeType.Regular_tetrahedron => ShapeType.Tetrahedron,
            ShapeType.Regular_pyramid => ShapeType.Pyramid,
            ShapeType.Regular_prism => ShapeType.Prism,
            ShapeType.Regular_cone => ShapeType.Cone,
            ShapeType.Regular_cylinder => ShapeType.Cylinder,
            ShapeType.Regular_sphere => ShapeType.Sphere,
            _ => shape
        };
    }

    public static ShapeType InferVolumeShape(string target)
    {
        if (string.IsNullOrWhiteSpace(target)) return ShapeType.Pyramid;
        if (target.Contains('.')) return ShapeType.Prism;

        var vertices = ParseVertices(target);
        return vertices.Count switch
        {
            4 => ShapeType.Tetrahedron,
            >= 5 => ShapeType.Pyramid,
            _ => ShapeType.Pyramid
        };
    }

    private static int FindClosingParen(string text, int openPos)
    {
        int pos = openPos, counter = 1;
        while (counter > 0 && pos < text.Length - 1)
        {
            char c = text[++pos];
            if (c == '(') counter++;
            else if (c == ')') counter--;
        }
        return counter == 0 ? pos : -1;
    }

    public static Plane3D? TryCreatePlane(IReadOnlyList<Point3D> points)
    {
        if (points.Count < 3) return null;

        for (int i = 0; i < points.Count - 2; i++)
        {
            for (int j = i + 1; j < points.Count - 1; j++)
            {
                for (int k = j + 1; k < points.Count; k++)
                {
                    var plane = new Plane3D(points[i], points[j], points[k]);
                    if (plane.Normal.Magnitude() > 1e-9)
                        return plane;
                }
            }
        }

        return null;
    }
}
