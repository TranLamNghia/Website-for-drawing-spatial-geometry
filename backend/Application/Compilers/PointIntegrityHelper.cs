using System;
using System.Collections.Generic;
using System.Linq;
using Application.DTOs;
using Domains.MathCore;

namespace Application.Compilers;

public sealed class PointIntegrityReport
{
    public int ExpectedCount { get; init; }
    public int ActualCount { get; init; }
    public bool AllDeclaredPresent { get; init; }
    public IReadOnlyList<string> MissingPoints { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> ExtraPoints { get; init; } = Array.Empty<string>();
    public bool IsValid => ExpectedCount == ActualCount && AllDeclaredPresent && ExtraPoints.Count == 0;
}

public static class PointIntegrityHelper
{
    private static readonly System.Text.RegularExpressions.Regex VertexRegex =
        new(@"[A-Z][0-9]*'*", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static PointIntegrityReport Evaluate(IEnumerable<string> declaredPoints, IDictionary<string, Point3D> compiledPoints)
    {
        var declared = declaredPoints
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim().ToUpper())
            .Distinct()
            .ToList();

        var compiledKeys = compiledPoints.Keys
            .Select(k => k.ToUpper())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missing = declared.Where(p => !compiledKeys.Contains(p)).ToList();
        var declaredSet = declared.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var extra = compiledPoints.Keys
            .Where(k => !declaredSet.Contains(k))
            .Select(k => k.ToUpper())
            .Distinct()
            .ToList();

        var presentDeclared = declared.Count(p => compiledKeys.Contains(p));

        return new PointIntegrityReport
        {
            ExpectedCount = declared.Count,
            ActualCount = presentDeclared,
            AllDeclaredPresent = missing.Count == 0,
            MissingPoints = missing,
            ExtraPoints = extra
        };
    }

    public static Dictionary<string, Point3D> FilterToDeclared(
        IEnumerable<string> declaredPoints,
        IDictionary<string, Point3D> compiledPoints)
    {
        var declaredSet = declaredPoints
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return compiledPoints
            .Where(kvp => declaredSet.Contains(kvp.Key))
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value, StringComparer.OrdinalIgnoreCase);
    }

    public static List<string> FilterSegments(EntitiesDto entities, IEnumerable<string> segments)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var seg in entities.Segments)
        {
            if (string.IsNullOrWhiteSpace(seg)) continue;
            allowed.Add(NormalizeSegmentKey(seg));
        }

        foreach (var plane in entities.Planes)
        {
            var verts = ParseLabels(plane);
            for (int i = 0; i < verts.Count; i++)
            {
                var a = verts[i];
                var b = verts[(i + 1) % verts.Count];
                allowed.Add(NormalizeSegmentKey($"{a}{b}"));
            }
        }

        foreach (var solid in entities.Solids)
        {
            var parts = solid.Split('.', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2)
            {
                var top = ParseLabels(parts[0]);
                var bottom = ParseLabels(parts[1]);
                if (top.Count == 1)
                {
                    foreach (var v in bottom)
                        allowed.Add(NormalizeSegmentKey($"{top[0]}{v}"));
                }
            }
        }

        return segments
            .Select(NormalizeSegmentKey)
            .Where(s => allowed.Contains(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> ParseLabels(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return new List<string>();
        return VertexRegex.Matches(value.Replace("(", "").Replace(")", ""))
            .Cast<System.Text.RegularExpressions.Match>()
            .Select(m => m.Value.ToUpper())
            .ToList();
    }

    private static string NormalizeSegmentKey(string seg)
    {
        var verts = ParseLabels(seg.Replace("-", ""));
        if (verts.Count != 2) return seg.Trim().ToUpper();
        return string.Join("-", verts.OrderBy(v => v, StringComparer.Ordinal));
    }
}
