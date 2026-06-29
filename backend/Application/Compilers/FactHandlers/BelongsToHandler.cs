using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class BelongsToHandler : IFactHandler
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);

    public FactType TargetFactType => FactType.belongs_to;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<BelongsToData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Target)) return;

        string pointName = data.Point;
        string target = data.Target;
        var vertices = ParseVertices(target);

        if (vertices.Count == 2)
        {
            var p1 = context.GetPoint(vertices[0]);
            var p2 = context.GetPoint(vertices[1]);
            if (p1 == null || p2 == null) return;

            double ratio = ResolveSegmentRatio(context, pointName, target, vertices);
            context.Points[pointName] = p1.GetPointAtRatio(p2, ratio);
            Console.WriteLine($"[HANDLER] Đã đặt điểm {pointName} trên {target} (tỉ lệ {ratio:F2})");
            return;
        }

        if (vertices.Count >= 3)
        {
            var points = context.GetPointsFromPlane(target);
            if (points.Count >= 3)
            {
                context.Points[pointName] = Point3D.GetCentroid(points.ToArray());
                Console.WriteLine($"[HANDLER] Đã đặt điểm {pointName} trên mặt phẳng {target}");
            }
        }
    }

    private static double ResolveSegmentRatio(
        CompilationContext context,
        string pointName,
        string target,
        List<string> segmentVertices)
    {
        var coupled = TryGetCoupledLateralRatio(context, pointName, target, segmentVertices);
        if (coupled.HasValue) return coupled.Value;
        return 0.5;
    }

    /// <summary>
    /// Khi MN // mp(SAB) với M ∈ SD, N ∈ SC: đặt cùng tỉ lệ trên các cạnh bên để MN // đáy.
    /// </summary>
    private static double? TryGetCoupledLateralRatio(
        CompilationContext context,
        string pointName,
        string target,
        List<string> segmentVertices)
    {
        foreach (var parallelFact in context.SourceFacts.Where(f => f.Type == FactType.Parallel))
        {
            var parallelData = parallelFact.GetDataAs<ObjectsData>();
            if (parallelData?.Objects == null || parallelData.Objects.Count < 2) continue;

            var lineVerts = ParseVertices(parallelData.Objects[0]);
            var planeVerts = ParseVertices(parallelData.Objects[1]);
            if (lineVerts.Count != 2 || planeVerts.Count < 3) continue;
            if (!lineVerts.Contains(pointName, StringComparer.OrdinalIgnoreCase)) continue;

            var belongsFacts = context.SourceFacts
                .Where(f => f.Type == FactType.belongs_to)
                .Select(f => f.GetDataAs<BelongsToData>())
                .Where(b => b != null && !string.IsNullOrWhiteSpace(b.Point) && !string.IsNullOrWhiteSpace(b.Target))
                .ToList();

            var coupledPoints = belongsFacts
                .Where(b => lineVerts.Contains(b!.Point, StringComparer.OrdinalIgnoreCase))
                .Select(b => new
                {
                    Point = b!.Point,
                    Segment = ParseVertices(b.Target),
                })
                .Where(x => x.Segment.Count == 2)
                .ToList();

            if (coupledPoints.Count < 2) continue;

            bool sharesApex = coupledPoints
                .Select(x => x.Segment[0])
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count() == 1;

            if (sharesApex || coupledPoints.Count >= 2)
                return 0.5;
        }

        return null;
    }

    private static List<string> ParseVertices(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return new List<string>();
        return VertexRegex.Matches(input)
            .Cast<Match>()
            .Select(m => m.Value.ToUpper())
            .ToList();
    }
}
