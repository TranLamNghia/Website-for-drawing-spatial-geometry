using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class EqualityHandler : IFactHandler
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);

    public FactType TargetFactType => FactType.Equality;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<EqualityData>();
        if (data == null)
        {
            return;
        }

        if (TryEnforceSegmentLengthEquality(data, context))
        {
            return;
        }

        if (data.Objects != null && data.Objects.Count >= 2)
        {
            Console.WriteLine($"[HANDLER] Ghi nhận bằng nhau: {string.Join(" = ", data.Objects)}");
            return;
        }

        if (!string.IsNullOrWhiteSpace(data.Left) && !string.IsNullOrWhiteSpace(data.Right))
        {
            Console.WriteLine($"[HANDLER] Ghi nhận bằng nhau: {data.Left} = {data.Right}");
        }
    }

    private static bool TryEnforceSegmentLengthEquality(EqualityData data, CompilationContext context)
    {
        string left = data.Left ?? data.Objects?.ElementAtOrDefault(0) ?? string.Empty;
        string right = data.Right ?? data.Objects?.ElementAtOrDefault(1) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
        {
            return false;
        }

        var leftVerts = ParseVertices(left);
        var rightVerts = ParseVertices(right);
        if (leftVerts.Count != 2 || rightVerts.Count != 2)
        {
            return false;
        }

        string? shared = leftVerts.FirstOrDefault(v => rightVerts.Contains(v, StringComparer.OrdinalIgnoreCase));
        if (string.IsNullOrEmpty(shared))
        {
            return false;
        }

        string otherLeft = leftVerts[0].Equals(shared, StringComparison.OrdinalIgnoreCase) ? leftVerts[1] : leftVerts[0];
        string otherRight = rightVerts[0].Equals(shared, StringComparison.OrdinalIgnoreCase) ? rightVerts[1] : rightVerts[0];

        var hostSegment = FindHostSegment(context, shared);
        if (hostSegment == null)
        {
            return false;
        }

        var segStart = context.GetPoint(hostSegment[0]);
        var segEnd = context.GetPoint(hostSegment[1]);
        var fixedA = context.GetPoint(otherLeft);
        var fixedB = context.GetPoint(otherRight);
        if (segStart == null || segEnd == null || fixedA == null || fixedB == null)
        {
            return false;
        }

        if (!TrySolveEqualDistanceOnSegment(fixedA, fixedB, segStart, segEnd, out double ratio))
        {
            return false;
        }

        context.Points[shared] = segStart.GetPointAtRatio(segEnd, ratio);
        Console.WriteLine(
            $"[HANDLER] Đặt {shared} trên {hostSegment[0]}{hostSegment[1]} sao cho {left} = {right} (t={ratio:F4})");
        return true;
    }

    /// <summary>
    /// Tìm t in [0,1] sao cho |fixedA - (segStart + t*(segEnd-segStart))| = |fixedB - (...)|.
    /// </summary>
    private static bool TrySolveEqualDistanceOnSegment(
        Point3D fixedA,
        Point3D fixedB,
        Point3D segStart,
        Point3D segEnd,
        out double ratio)
    {
        ratio = 0.5;
        var u = new Vector3D(segStart, segEnd);
        var bd = new Vector3D(fixedB, fixedA);

        double denom = 2.0 * (bd.X * u.X + bd.Y * u.Y + bd.Z * u.Z);
        if (Math.Abs(denom) < 1e-9)
        {
            return false;
        }

        double numerator = NormSq(fixedA) - NormSq(fixedB)
            - 2.0 * (bd.X * segStart.X + bd.Y * segStart.Y + bd.Z * segStart.Z);
        ratio = numerator / denom;
        ratio = Math.Clamp(ratio, 0.0, 1.0);
        return true;
    }

    private static double NormSq(Point3D p) => p.X * p.X + p.Y * p.Y + p.Z * p.Z;

    private static List<string>? FindHostSegment(CompilationContext context, string pointName)
    {
        foreach (var fact in context.SourceFacts.Where(f => f.Type == FactType.belongs_to))
        {
            var belongs = fact.GetDataAs<BelongsToData>();
            if (belongs == null
                || string.IsNullOrWhiteSpace(belongs.Point)
                || !belongs.Point.Equals(pointName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var vertices = ParseVertices(belongs.Target);
            if (vertices.Count == 2)
            {
                return vertices;
            }
        }

        return null;
    }

    private static List<string> ParseVertices(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return new List<string>();
        }

        return VertexRegex.Matches(input)
            .Cast<Match>()
            .Select(m => m.Value.ToUpper())
            .ToList();
    }
}
