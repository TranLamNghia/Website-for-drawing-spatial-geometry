using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers;

/// <summary>
/// Dựng tọa độ tối thiểu từ entities khi chưa có fact shape (đoạn thẳng, giao điểm, mặt phẳng...).
/// </summary>
public static class EntityScaffoldBuilder
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);

    public static void Build(GeometryProblemDto problem, CompilationContext context)
    {
        var declared = problem.Entities.Points
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim().ToUpper())
            .Distinct()
            .ToList();

        if (declared.Count == 0) return;

        int missing = declared.Count(p => !context.Points.ContainsKey(p));
        if (missing == 0) return;

        if (HasSolidOrPyramid(problem)) return;

        // Đã dựng tam giác từ fact shape — không scaffold AB/BC chồng lên tọa độ đáy.
        if (HasTriangleShapeFact(problem)) return;

        if (TryBuildIntersectingLines(problem, context)) return;
        if (TryBuildTwoPlanes(problem, context)) return;
        if (TryBuildSingleSegment(problem, context, declared)) return;
        if (TryBuildPolygonFromDeclaredPoints(problem, context, declared)) return;
    }

    private static bool TryBuildSingleSegment(GeometryProblemDto problem, CompilationContext context, List<string> declared)
    {
        if (HasSolidOrPyramid(problem)) return false;

        var host = ResolveHostSegment(problem, declared);
        if (host == null) return false;

        var vertices = ParseVertices(host);
        if (vertices.Count != 2) return false;

        var (a, b) = (vertices[0], vertices[1]);
        double len = ResolveSegmentLength(problem, a, b, context.UnitLength * 2);

        if (!context.Points.ContainsKey(a))
            context.Points[a] = new Point3D(0, 0, 0);
        if (!context.Points.ContainsKey(b))
            context.Points[b] = new Point3D(len, 0, 0);

        context.AddGeneratedSegment(a, b);
        Console.WriteLine($"[SCAFFOLD] Dựng đoạn {a}{b} dài {len:F2}");
        return true;
    }

    private static string? ResolveHostSegment(GeometryProblemDto problem, List<string> declared)
    {
        foreach (var seg in problem.Entities.Segments)
        {
            if (string.IsNullOrWhiteSpace(seg)) continue;
            var v = ParseVertices(seg);
            if (v.Count == 2 && declared.Contains(v[0]) && declared.Contains(v[1]))
                return seg;
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Length))
        {
            if (fact.GetDataAs<LengthData>() is not LengthData ld || string.IsNullOrWhiteSpace(ld.Target))
                continue;
            var v = ParseVertices(ld.Target);
            if (v.Count == 2 && declared.Contains(v[0]) && declared.Contains(v[1]))
                return ld.Target;
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Midpoint))
        {
            if (fact.GetDataAs<MidpointData>() is not MidpointData md || string.IsNullOrWhiteSpace(md.Segment))
                continue;
            var v = ParseVertices(md.Segment);
            if (v.Count == 2) return md.Segment;
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.Ratio))
        {
            if (fact.GetDataAs<RatioData>() is not RatioData rd) continue;
            var v1 = ParseVertices(rd.Segment1);
            var v2 = ParseVertices(rd.Segment2);
            if (v1.Count == 2 && v2.Count == 2 && v1[1] == v2[0])
                return $"{v1[0]}{v2[1]}";
        }

        foreach (var fact in problem.Facts.Where(f => f.Type == FactType.belongs_to))
        {
            if (fact.GetDataAs<BelongsToData>() is not BelongsToData bd || string.IsNullOrWhiteSpace(bd.Target))
                continue;
            var v = ParseVertices(bd.Target);
            if (v.Count == 2) return bd.Target;
        }

        return null;
    }

    private static bool TryBuildIntersectingLines(GeometryProblemDto problem, CompilationContext context)
    {
        var segments = problem.Entities.Segments
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(ParseVertices)
            .Where(v => v.Count == 2)
            .Distinct(new SegmentComparer())
            .Take(2)
            .ToList();

        if (segments.Count < 2)
        {
            segments = CollectSegments(problem)
                .Select(ParseVertices)
                .Where(v => v.Count == 2)
                .Distinct(new SegmentComparer())
                .Take(2)
                .ToList();
        }

        if (segments.Count < 2) return false;

        var line1 = segments[0];
        var line2 = segments[1];
        double len1 = ResolveSegmentLength(problem, line1[0], line1[1], context.UnitLength * 1.2);
        double len2 = ResolveSegmentLength(problem, line2[0], line2[1], context.UnitLength);

        context.Points[line1[0]] = new Point3D(0, 0, 0);
        context.Points[line1[1]] = new Point3D(len1, 0, 0);
        double midX = len1 / 2.0;
        context.Points[line2[0]] = new Point3D(midX, len2 / 2.0, 0);
        context.Points[line2[1]] = new Point3D(midX, -len2 / 2.0, 0);

        context.AddGeneratedSegment(line1[0], line1[1]);
        context.AddGeneratedSegment(line2[0], line2[1]);
        Console.WriteLine($"[SCAFFOLD] Dựng hai đường cắt nhau {line1[0]}{line1[1]} và {line2[0]}{line2[1]}");
        return true;
    }

    private static bool TryBuildTwoPlanes(GeometryProblemDto problem, CompilationContext context)
    {
        var planes = problem.Entities.Planes
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => ParseVertices(p.Replace("(", "").Replace(")", "")))
            .Where(v => v.Count >= 3)
            .Take(2)
            .ToList();

        if (planes.Count < 2) return false;

        var p1 = planes[0];
        var p2 = planes[1];
        string a = p1[0];
        string b = p1.Count > 1 ? p1[1] : "B";
        string c = p1.Count > 2 ? p1[2] : "C";
        string d = p2.FirstOrDefault(v => v != a && v != b) ?? "D";

        double edge = context.UnitLength;
        context.Points[a] = new Point3D(0, 0, 0);
        context.Points[b] = new Point3D(edge, 0, 0);
        context.Points[c] = new Point3D(0, edge, 0);
        context.Points[d] = new Point3D(0, 0, edge);

        // Chỉ cạnh biên của từng mặt phẳng — không nối CD (không thuộc mp ABC/ABD)
        AddUniqueSegment(context, a, b);
        AddUniqueSegment(context, b, c);
        AddUniqueSegment(context, c, a);
        AddUniqueSegment(context, a, d);
        AddUniqueSegment(context, b, d);

        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { a, b, c } });
        context.GeneratedPlanes.Add(new PlaneData { Points = new[] { a, b, d } });
        Console.WriteLine($"[SCAFFOLD] Dựng hai mặt phẳng ({string.Join("", p1)}) và ({string.Join("", p2)})");
        return true;
    }

    private static void AddUniqueSegment(CompilationContext context, string p1, string p2)
    {
        context.AddGeneratedSegment(p1, p2);
    }

    private static bool TryBuildPolygonFromDeclaredPoints(GeometryProblemDto problem, CompilationContext context, List<string> declared)
    {
        if (declared.Count < 3) return false;

        if (problem.Facts.Any(f => f.Type is FactType.Ratio or FactType.Midpoint or FactType.belongs_to))
            return false;

        if (problem.Facts.Any(f => f.Type is FactType.Ray or FactType.Opposite_ray or FactType.Perpendicular_ray))
            return false;

        if (problem.Facts.Any(f => f.Type == FactType.Shape))
            return false;

        if (problem.Entities.Solids.Any(s => !string.IsNullOrWhiteSpace(s)))
            return false;

        if (ResolveHostSegment(problem, declared) != null)
            return false;

        double edge = context.UnitLength;
        for (int i = 0; i < declared.Count; i++)
        {
            if (context.Points.ContainsKey(declared[i])) continue;
            double angle = 2.0 * Math.PI * i / declared.Count - Math.PI / 2.0;
            context.Points[declared[i]] = new Point3D(edge * Math.Cos(angle), edge * Math.Sin(angle), 0);
        }

        for (int i = 0; i < declared.Count; i++)
            context.AddGeneratedSegment(declared[i], declared[(i + 1) % declared.Count]);

        Console.WriteLine($"[SCAFFOLD] Dựng đa giác từ entities.points: {string.Join("", declared)}");
        return true;
    }

    private static IEnumerable<string> CollectSegments(GeometryProblemDto problem)
    {
        foreach (var seg in problem.Entities.Segments)
            if (!string.IsNullOrWhiteSpace(seg)) yield return seg;

        foreach (var fact in problem.Facts)
        {
            if (fact.Type == FactType.Length && fact.GetDataAs<LengthData>() is LengthData ld && !string.IsNullOrWhiteSpace(ld.Target))
                yield return ld.Target;
            if (fact.Type == FactType.Midpoint && fact.GetDataAs<MidpointData>() is MidpointData md && !string.IsNullOrWhiteSpace(md.Segment))
                yield return md.Segment;
        }
    }

    private static double ResolveSegmentLength(GeometryProblemDto problem, string a, string b, double defaultLen)
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

            if (double.TryParse(ld.Value, System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out double numeric))
                return numeric;

            if (ld.Value.Contains("2a", StringComparison.OrdinalIgnoreCase) ||
                ld.Value.Contains("2 * a", StringComparison.OrdinalIgnoreCase))
                return defaultLen;

            if (ld.Value.Equals("a", StringComparison.OrdinalIgnoreCase))
                return defaultLen / 2.0;
        }

        return defaultLen;
    }

    private static List<string> ParseVertices(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return new List<string>();
        return VertexRegex.Matches(input).Cast<Match>().Select(m => m.Value.ToUpper()).ToList();
    }

    private static bool HasTriangleShapeFact(GeometryProblemDto problem) =>
        problem.Facts.Any(f =>
            f.Type == FactType.Shape &&
            f.GetDataAs<ShapeData>() is ShapeData sd &&
            TriangleBuildHelper.IsTriangleShape(sd.Shape));

    private static bool HasSolidOrPyramid(GeometryProblemDto problem)
    {
        if (problem.Entities.Solids.Any(s => !string.IsNullOrWhiteSpace(s)))
            return true;

        var pyramidShapes = new[]
        {
            ShapeType.Pyramid, ShapeType.Regular_pyramid,
            ShapeType.Pentagonal_pyramid, ShapeType.Hexagonal_pyramid,
            ShapeType.Prism, ShapeType.Regular_prism,
            ShapeType.Tetrahedron, ShapeType.Regular_tetrahedron,
        };

        return problem.Facts.Any(f =>
            f.Type == FactType.Shape &&
            f.GetDataAs<ShapeData>() is ShapeData sd &&
            pyramidShapes.Contains(sd.Shape));
    }

    private sealed class SegmentComparer : IEqualityComparer<List<string>>
    {
        public bool Equals(List<string>? x, List<string>? y)
        {
            if (x == null || y == null) return false;
            if (x.Count != y.Count) return false;
            return (x[0] == y[0] && x[1] == y[1]) || (x[0] == y[1] && x[1] == y[0]);
        }

        public int GetHashCode(List<string> obj)
        {
            var ordered = obj.OrderBy(v => v, StringComparer.Ordinal).ToArray();
            return HashCode.Combine(ordered[0], ordered[1]);
        }
    }
}
