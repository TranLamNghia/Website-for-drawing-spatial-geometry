using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers;

public readonly struct TrianglePlacement
{
    public ShapeType Shape { get; init; }
    public int RightVertexIndex { get; init; }
    public int IsoscelesApexIndex { get; init; }
    public double LegToPrev { get; init; }
    public double LegToNext { get; init; }
    public double BaseWidth { get; init; }
    public double ApexHeight { get; init; }
    public double SideOppositeB { get; init; }
}

/// <summary>
/// Ưu tiên dựng tam giác: thường → vuông → cân → vuông cân → đều.
/// Chỉ nâng cấp lên dạng đặc biệt hơn khi đề/fact nói rõ hoặc có điều kiện bổ sung.
/// </summary>
public static class TriangleBuildHelper
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);
    private static readonly Regex RightAtRegex = new(@"vuông\s*tại\s*'?([A-Z][0-9]*'*)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly HashSet<ShapeType> TriangleShapes = new()
    {
        ShapeType.Triangle,
        ShapeType.Right_triangle,
        ShapeType.Isosceles_triangle,
        ShapeType.Isosceles_right_triangle,
        ShapeType.Equilateral_triangle,
    };

    public static bool IsTriangleShape(ShapeType shape) => TriangleShapes.Contains(shape);

    public static TrianglePlacement ResolvePlacement(
        GeometryProblemDto problem,
        ShapeType declaredShape,
        IReadOnlyList<string> vertices,
        double unitLength,
        double defaultWidth,
        double defaultHeight)
    {
        if (vertices.Count != 3)
        {
            return new TrianglePlacement
            {
                Shape = declaredShape,
                BaseWidth = defaultWidth,
                ApexHeight = defaultHeight,
                SideOppositeB = defaultHeight,
            };
        }

        int rightVertex = FindRightVertexIndex(problem, vertices);
        bool legsEqual = rightVertex >= 0 && AreAdjacentLegsEqual(problem, vertices, rightVertex, unitLength, defaultWidth, defaultHeight);
        bool allSidesEqual = AreAllSidesExplicitlyEqual(problem, vertices);

        ShapeType resolved = ResolveTriangleShape(declaredShape, rightVertex, legsEqual, allSidesEqual);

        double legPrev = defaultWidth;
        double legNext = defaultHeight;
        if (resolved is ShapeType.Right_triangle or ShapeType.Isosceles_right_triangle && rightVertex >= 0)
        {
            int prev = (rightVertex + 2) % 3;
            int next = (rightVertex + 1) % 3;
            legPrev = GetSegmentLength(problem, vertices[rightVertex], vertices[prev], unitLength, defaultWidth);
            legNext = GetSegmentLength(problem, vertices[rightVertex], vertices[next], unitLength,
                resolved == ShapeType.Isosceles_right_triangle ? legPrev : defaultWidth * 1.35);

            if (resolved == ShapeType.Isosceles_right_triangle)
                legNext = legPrev;
            else if (Math.Abs(legPrev - legNext) < 1e-3)
                legNext = legPrev * 1.35;
        }

        double baseWidth = defaultWidth;
        double apexHeight = defaultHeight;
        if (resolved == ShapeType.Isosceles_triangle)
        {
            int apex = FindIsoscelesApexIndex(problem, vertices);
            baseWidth = GetSegmentLength(problem, vertices[(apex + 1) % 3], vertices[(apex + 2) % 3], unitLength, defaultWidth);
            apexHeight = defaultHeight > 0 ? defaultHeight : unitLength * 1.2;
            return new TrianglePlacement
            {
                Shape = resolved,
                IsoscelesApexIndex = apex,
                BaseWidth = baseWidth,
                ApexHeight = apexHeight,
            };
        }

        if (resolved == ShapeType.Equilateral_triangle)
        {
            double edge = allSidesEqual
                ? GetSegmentLength(problem, vertices[0], vertices[1], unitLength, defaultWidth)
                : defaultWidth;
            return new TrianglePlacement
            {
                Shape = resolved,
                BaseWidth = edge,
                ApexHeight = edge,
            };
        }

        if (resolved is ShapeType.Right_triangle or ShapeType.Isosceles_right_triangle)
        {
            return new TrianglePlacement
            {
                Shape = resolved,
                RightVertexIndex = rightVertex >= 0 ? rightVertex : 0,
                LegToPrev = legPrev,
                LegToNext = legNext,
            };
        }

        double sideOpposite = GetSegmentLength(problem, vertices[0], vertices[2], unitLength, -1);
        return new TrianglePlacement
        {
            Shape = ShapeType.Triangle,
            BaseWidth = defaultWidth,
            ApexHeight = defaultHeight,
            SideOppositeB = sideOpposite > 0 ? sideOpposite : -1,
        };
    }

    public static void Place(Dictionary<string, Point3D> points, IReadOnlyList<string> vertices, TrianglePlacement placement)
    {
        if (vertices.Count != 3) return;

        switch (placement.Shape)
        {
            case ShapeType.Equilateral_triangle:
            {
                double edge = placement.BaseWidth;
                points[vertices[0]] = new Point3D(0, 0, 0);
                points[vertices[1]] = new Point3D(edge, 0, 0);
                points[vertices[2]] = new Point3D(edge / 2.0, edge * Math.Sqrt(3) / 2.0, 0);
                break;
            }
            case ShapeType.Isosceles_triangle:
            {
                int apex = placement.IsoscelesApexIndex >= 0 ? placement.IsoscelesApexIndex : 0;
                int left = (apex + 1) % 3;
                int right = (apex + 2) % 3;
                points[vertices[left]] = new Point3D(0, 0, 0);
                points[vertices[right]] = new Point3D(placement.BaseWidth, 0, 0);
                points[vertices[apex]] = new Point3D(placement.BaseWidth / 2.0, placement.ApexHeight, 0);
                break;
            }
            case ShapeType.Right_triangle:
            case ShapeType.Isosceles_right_triangle:
            {
                int r = placement.RightVertexIndex >= 0 ? placement.RightVertexIndex : 0;
                int prev = (r + 2) % 3;
                int next = (r + 1) % 3;
                points[vertices[r]] = new Point3D(0, 0, 0);
                points[vertices[prev]] = new Point3D(placement.LegToPrev, 0, 0);
                points[vertices[next]] = new Point3D(0, placement.LegToNext, 0);
                break;
            }
            default:
            {
                double cLen = placement.BaseWidth;
                double aLen = placement.ApexHeight;
                double ac = placement.SideOppositeB;

                double cosB = 0.3;
                if (ac > 0)
                {
                    cosB = (aLen * aLen + cLen * cLen - ac * ac) / (2 * aLen * cLen);
                    cosB = Math.Max(-1, Math.Min(1, cosB));
                }

                double sinB = Math.Sqrt(Math.Max(0, 1 - cosB * cosB));
                points[vertices[0]] = new Point3D(0, 0, 0);
                points[vertices[1]] = new Point3D(cLen, 0, 0);
                points[vertices[2]] = new Point3D(cLen - aLen * cosB, aLen * sinB, 0);
                break;
            }
        }
    }

    private static ShapeType ResolveTriangleShape(
        ShapeType declared,
        int rightVertex,
        bool legsEqual,
        bool allSidesEqual)
    {
        declared = NormalizeDeclared(declared);

        if (allSidesEqual && declared is ShapeType.Triangle or ShapeType.Equilateral_triangle)
            return ShapeType.Equilateral_triangle;

        if (declared == ShapeType.Equilateral_triangle)
            return ShapeType.Equilateral_triangle;

        if (declared == ShapeType.Isosceles_right_triangle || (rightVertex >= 0 && legsEqual))
            return ShapeType.Isosceles_right_triangle;

        if (declared == ShapeType.Isosceles_triangle)
            return ShapeType.Isosceles_triangle;

        if (declared == ShapeType.Right_triangle || rightVertex >= 0)
            return ShapeType.Right_triangle;

        return ShapeType.Triangle;
    }

    private static ShapeType NormalizeDeclared(ShapeType shape) => shape switch
    {
        ShapeType.Regular_tetrahedron => ShapeType.Equilateral_triangle,
        _ => shape,
    };

    private static int FindRightVertexIndex(GeometryProblemDto problem, IReadOnlyList<string> vertices)
    {
        string targetKey = string.Join("", vertices);

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Shape))
        {
            var data = fact.GetDataAs<ShapeData>();
            if (data == null || !TargetMatchesVertices(data.Target, vertices)) continue;

            if (data.Shape is ShapeType.Right_triangle or ShapeType.Isosceles_right_triangle)
            {
                if (!string.IsNullOrWhiteSpace(data.Vertex))
                {
                    int vtx = IndexOfVertex(vertices, data.Vertex.Trim());
                    if (vtx >= 0) return vtx;
                }

                var match = RightAtRegex.Match(fact.RawText ?? string.Empty);
                if (match.Success)
                {
                    int idx = IndexOfVertex(vertices, match.Groups[1].Value);
                    if (idx >= 0) return idx;
                }
            }
        }

        foreach (var fact in problem.Facts)
        {
            var match = RightAtRegex.Match(fact.RawText ?? string.Empty);
            if (!match.Success) continue;
            int idx = IndexOfVertex(vertices, match.Groups[1].Value);
            if (idx >= 0) return idx;
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Angle))
        {
            if (fact.GetDataAs<AngleData>() is not AngleData angle || !IsRightAngle(angle.Value)) continue;
            int idx = FindVertexFromAngleObjects(angle.Objects, vertices);
            if (idx >= 0) return idx;
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Perpendicular))
        {
            if (fact.GetDataAs<ObjectsData>() is not ObjectsData pd || pd.Objects == null || pd.Objects.Count < 2)
                continue;

            int idx = FindSharedVertex(pd.Objects[0], pd.Objects[1], vertices);
            if (idx >= 0) return idx;
        }

        if (problem.Facts.Any(f =>
                f.Type == FactType.Shape &&
                f.GetDataAs<ShapeData>() is ShapeData sd &&
                TargetMatchesVertices(sd.Target, vertices) &&
                sd.Shape is ShapeType.Right_triangle or ShapeType.Isosceles_right_triangle))
        {
            return 0;
        }

        return -1;
    }

    private static int FindIsoscelesApexIndex(GeometryProblemDto problem, IReadOnlyList<string> vertices)
    {
        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Equality))
        {
            if (fact.GetDataAs<EqualityData>() is not EqualityData eq) continue;
            var left = ParseLabels(eq.Left ?? eq.Objects?.FirstOrDefault() ?? string.Empty);
            var right = ParseLabels(eq.Right ?? eq.Objects?.LastOrDefault() ?? string.Empty);
            if (left.Count == 2 && right.Count == 2)
            {
                string shared = left.Intersect(right, StringComparer.OrdinalIgnoreCase).FirstOrDefault() ?? string.Empty;
                int idx = IndexOfVertex(vertices, shared);
                if (idx >= 0) return idx;
            }
        }

        return 0;
    }

    private static bool AreAdjacentLegsEqual(
        GeometryProblemDto problem,
        IReadOnlyList<string> vertices,
        int rightVertex,
        double unitLength,
        double defaultWidth,
        double defaultHeight)
    {
        int prev = (rightVertex + 2) % 3;
        int next = (rightVertex + 1) % 3;
        double legPrev = GetSegmentLength(problem, vertices[rightVertex], vertices[prev], unitLength, defaultWidth);
        double legNext = GetSegmentLength(problem, vertices[rightVertex], vertices[next], unitLength, defaultHeight);

        if (Math.Abs(legPrev - legNext) < 1e-3)
            return true;

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Equality))
        {
            if (fact.GetDataAs<EqualityData>() is not EqualityData eq) continue;
            var a = ParseLabels(eq.Left ?? eq.Objects?.FirstOrDefault() ?? string.Empty);
            var b = ParseLabels(eq.Right ?? eq.Objects?.LastOrDefault() ?? string.Empty);
            if (a.Count == 2 && b.Count == 2 &&
                SharesVertex(a, vertices[rightVertex]) && SharesVertex(b, vertices[rightVertex]) &&
                !string.Equals(a[0] + a[1], b[0] + b[1], StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool AreAllSidesExplicitlyEqual(GeometryProblemDto problem, IReadOnlyList<string> vertices)
    {
        var lengths = new List<double>();
        for (int i = 0; i < 3; i++)
        {
            double len = GetSegmentLength(problem, vertices[i], vertices[(i + 1) % 3], -1, -1);
            if (len <= 0) return false;
            lengths.Add(len);
        }

        return lengths.All(l => Math.Abs(l - lengths[0]) < 1e-3);
    }

    private static double GetSegmentLength(
        GeometryProblemDto problem,
        string a,
        string b,
        double unitLength,
        double fallback)
    {
        string direct = $"{a}{b}";
        string reverse = $"{b}{a}";
        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Length))
        {
            if (fact.GetDataAs<LengthData>() is not LengthData ld || string.IsNullOrWhiteSpace(ld.Target))
                continue;

            string target = ld.Target.Trim();
            if (!target.Equals(direct, StringComparison.OrdinalIgnoreCase) &&
                !target.Equals(reverse, StringComparison.OrdinalIgnoreCase))
                continue;

            if (TryEvaluate(ld.Value, unitLength, out double value))
                return value;
        }

        return fallback;
    }

    private static bool TryEvaluate(string expr, double unitLength, out double value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(expr)) return false;

        if (double.TryParse(expr, NumberStyles.Float, CultureInfo.InvariantCulture, out value))
            return true;

        try
        {
            string sanitized = expr.ToLowerInvariant().Replace(" ", "");
            sanitized = Regex.Replace(sanitized, @"(\d)a", "$1*a");
            sanitized = sanitized.Replace("a", unitLength.ToString(CultureInfo.InvariantCulture));
            var dt = new System.Data.DataTable();
            value = Convert.ToDouble(dt.Compute(sanitized, string.Empty), CultureInfo.InvariantCulture);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool TargetMatchesVertices(string target, IReadOnlyList<string> vertices)
    {
        var labels = ParseLabels(target);
        return labels.Count == vertices.Count &&
               labels.SequenceEqual(vertices, StringComparer.OrdinalIgnoreCase);
    }

    private static int FindVertexFromAngleObjects(IReadOnlyList<string> objects, IReadOnlyList<string> vertices)
    {
        if (objects == null || objects.Count < 2) return -1;

        var seg1 = ParseLabels(objects[0]);
        var seg2 = ParseLabels(objects[1]);
        if (seg1.Count == 2 && seg2.Count == 2)
        {
            if (seg1[1].Equals(seg2[0], StringComparison.OrdinalIgnoreCase))
                return IndexOfVertex(vertices, seg1[1]);
            if (seg2[1].Equals(seg1[0], StringComparison.OrdinalIgnoreCase))
                return IndexOfVertex(vertices, seg2[1]);
            if (seg1[0].Equals(seg2[0], StringComparison.OrdinalIgnoreCase))
                return IndexOfVertex(vertices, seg1[0]);
        }

        return -1;
    }

    private static bool IsRightAngle(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out double degrees))
            return Math.Abs(degrees - 90) < 1e-3;
        return value.Trim() == "90";
    }

    private static int FindSharedVertex(string seg1, string seg2, IReadOnlyList<string> vertices)
    {
        foreach (var vertex in vertices)
        {
            if (SharesVertex(ParseLabels(seg1), vertex) && SharesVertex(ParseLabels(seg2), vertex))
                return IndexOfVertex(vertices, vertex);
        }

        return -1;
    }

    private static bool SharesVertex(IReadOnlyList<string> segment, string vertex) =>
        segment.Count == 2 &&
        (segment[0].Equals(vertex, StringComparison.OrdinalIgnoreCase) ||
         segment[1].Equals(vertex, StringComparison.OrdinalIgnoreCase));

    private static int IndexOfVertex(IReadOnlyList<string> vertices, string label)
    {
        for (int i = 0; i < vertices.Count; i++)
        {
            if (vertices[i].Equals(label, StringComparison.OrdinalIgnoreCase))
                return i;
        }

        return -1;
    }

    private static List<string> ParseLabels(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return new List<string>();
        return VertexRegex.Matches(value)
            .Cast<Match>()
            .Select(m => m.Value.ToUpper())
            .ToList();
    }
}
