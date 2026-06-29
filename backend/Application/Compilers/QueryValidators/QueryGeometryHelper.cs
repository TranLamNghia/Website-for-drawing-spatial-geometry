using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Compilers;
using Application.Compilers.FactValidators;
using Application.DTOs;
using Application.DTOs.Queries;
using Domains.MathCore;

namespace Application.Compilers.QueryValidators;

internal static class QueryGeometryHelper
{
    private static readonly Regex VertexRegex = new(@"[A-Z][0-9]*'*", RegexOptions.Compiled);

    public static int CountVertices(string input) =>
        VertexRegex.Matches(input ?? string.Empty).Count;

    public static string? GetTarget(QueryDto query)
    {
        var data = query.GetDataAs<TargetQueryData>();
        if (!string.IsNullOrWhiteSpace(data?.Target)) return data.Target;

        if (query.Data.ValueKind == JsonValueKind.Object &&
            query.Data.TryGetProperty("target", out var targetProp))
        {
            return targetProp.GetString();
        }

        return null;
    }

    public static List<string> GetObjects(QueryDto query)
    {
        var data = query.GetDataAs<ObjectsQueryData>();
        if (data?.Objects is { Count: > 0 }) return data.Objects;

        if (query.Data.ValueKind == JsonValueKind.Object &&
            query.Data.TryGetProperty("objects", out var objectsProp) &&
            objectsProp.ValueKind == JsonValueKind.Array)
        {
            return objectsProp.EnumerateArray()
                .Select(x => x.GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .ToList();
        }

        return [];
    }

    public static List<string> GetPlanes(QueryDto query)
    {
        var data = query.GetDataAs<PlanesQueryData>();
        if (data?.Planes is { Count: > 0 }) return data.Planes;

        if (query.Data.ValueKind == JsonValueKind.Object &&
            query.Data.TryGetProperty("planes", out var planesProp) &&
            planesProp.ValueKind == JsonValueKind.Array)
        {
            return planesProp.EnumerateArray()
                .Select(x => x.GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .ToList();
        }

        return GetObjects(query);
    }

    public static (string? solid, string? plane) GetCrossSectionTargets(QueryDto query, GeometryProblemDto problem)
    {
        string? solid = null;
        string? plane = null;

        if (query.Data.ValueKind == JsonValueKind.Object)
        {
            if (query.Data.TryGetProperty("solid", out var solidProp)) solid = solidProp.GetString();
            if (query.Data.TryGetProperty("plane", out var planeProp)) plane = planeProp.GetString();
            if (query.Data.TryGetProperty("surface", out var surfaceProp) && string.IsNullOrEmpty(plane))
                plane = surfaceProp.GetString();

            if (string.IsNullOrEmpty(solid) && query.Data.TryGetProperty("target", out var targetProp))
                solid = targetProp.GetString();
        }

        if (string.IsNullOrEmpty(solid) && problem.Entities.Solids.Count > 0)
            solid = problem.Entities.Solids[0];

        return (solid, plane);
    }

    public static Line3D? ResolveLine(CompilationContext context, string target)
    {
        if (CountVertices(target) >= 2) return context.GetLine(target);
        return null;
    }

    public static Plane3D? ResolvePlane(CompilationContext context, string target)
    {
        if (CountVertices(target) >= 3) return context.GetPlane(target);
        return null;
    }

    public static Sphere3D? ResolveSphere(CompilationContext context, string target)
    {
        var normalized = (target ?? string.Empty).Replace("(", string.Empty).Replace(")", string.Empty).Trim();
        var sphereData = context.Spheres.FirstOrDefault(s =>
            s.Center == normalized || (target?.Contains(s.Center, StringComparison.Ordinal) ?? false));

        if (sphereData != null)
        {
            var center = context.GetPoint(sphereData.Center);
            if (center != null) return new Sphere3D(center, sphereData.Radius);
        }

        if (CountVertices(normalized) == 1)
        {
            var center = context.GetPoint(normalized);
            if (center != null)
            {
                var fallback = context.Spheres.FirstOrDefault(s => s.Center == normalized);
                if (fallback != null) return new Sphere3D(center, fallback.Radius);
            }
        }

        return null;
    }

    public static bool HasEnoughPoints(CompilationContext context, string expr)
    {
        var vertices = FactGeometryHelper.ParseVertices(expr);
        if (vertices.Count == 0) return false;
        return vertices.All(v => context.GetPoint(v) != null);
    }

    public static void StoreResult(CompilationContext context, string queryId, string key, string value)
    {
        context.QueryResults[$"{queryId}:{key}"] = value;
    }
}
