using Application.Compilers.FactValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Queries;
using Application.Compilers.QueryValidators;
using Domains.MathCore;

namespace Application.Compilers.QueryHandlers;

public class ShapeQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.shape;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var (solid, plane) = QueryGeometryHelper.GetCrossSectionTargets(query, problem);
        if (!string.IsNullOrEmpty(solid) && !string.IsNullOrEmpty(plane))
        {
            QueryGeometryHelper.StoreResult(context, query.Id, "cross_section", $"cross_section_{solid}_{plane}");
            Console.WriteLine($"[QUERY] shape: thiết diện {solid} ∩ ({plane})");
        }
    }
}

public class IntersectionLineQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.intersection_line;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var planes = QueryGeometryHelper.GetPlanes(query);
        if (planes.Count < 2)
        {
            var objects = QueryGeometryHelper.GetObjects(query);
            if (objects.Count >= 2) planes = objects;
        }

        if (planes.Count < 2) return;

        var p1 = QueryGeometryHelper.ResolvePlane(context, planes[0]);
        var p2 = QueryGeometryHelper.ResolvePlane(context, planes[1]);
        if (p1 == null || p2 == null) return;

        var line = p1.IntersectWith(p2);
        if (line == null) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "intersection_line", line.ToString());
        Console.WriteLine($"[QUERY] intersection_line: {planes[0]} ∩ {planes[1]} → {line}");
    }
}

public class EquationLineQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.equation_line;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target)) return;

        var line = QueryGeometryHelper.ResolveLine(context, target);
        if (line == null) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "equation", line.ToString());
        Console.WriteLine($"[QUERY] equation_line: {target} → {line}");
    }
}

public class EquationPlaneQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.equation_plane;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target)) return;

        var plane = QueryGeometryHelper.ResolvePlane(context, target);
        if (plane == null) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "equation", plane.ToString());
        Console.WriteLine($"[QUERY] equation_plane: {target} → {plane}");
    }
}

public class EquationSphereQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.equation_sphere;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target)) return;

        var sphere = QueryGeometryHelper.ResolveSphere(context, target);
        if (sphere == null) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "equation", sphere.ToString());
        Console.WriteLine($"[QUERY] equation_sphere: {target} → {sphere}");
    }
}

public class CoordinatesQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.coordinates;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target)) return;

        var point = context.GetPoint(target);
        if (point == null) return;

        var coords = $"({point.X:F4}, {point.Y:F4}, {point.Z:F4})";
        QueryGeometryHelper.StoreResult(context, query.Id, "coordinates", coords);
        Console.WriteLine($"[QUERY] coordinates: {target} → {coords}");
    }
}

public class LocusQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.locus;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target)) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "locus", target);
        Console.WriteLine($"[QUERY] locus: {target}");
    }
}

public class ProofParallelQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.proof_parallel;
    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count >= 2)
            Console.WriteLine($"[QUERY] proof_parallel: {objects[0]} ∥ {objects[1]}");
    }
}

public class ProofPerpendicularQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.proof_perpendicular;
    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count >= 2)
            Console.WriteLine($"[QUERY] proof_perpendicular: {objects[0]} ⊥ {objects[1]}");
    }
}

public class ProofEqualQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.proof_equal;
    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count >= 2)
            Console.WriteLine($"[QUERY] proof_equal: {string.Join(" = ", objects)}");
    }
}

public class CosineBetweenPlanesQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.cosine_between_planes;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var planes = QueryGeometryHelper.GetPlanes(query);
        if (planes.Count < 2) return;

        var p1 = QueryGeometryHelper.ResolvePlane(context, planes[0]);
        var p2 = QueryGeometryHelper.ResolvePlane(context, planes[1]);
        if (p1 == null || p2 == null) return;

        double angleDeg = p1.AngleWithPlane(p2);
        double cosine = Math.Cos(angleDeg * Math.PI / 180.0);
        QueryGeometryHelper.StoreResult(context, query.Id, "cosine", cosine.ToString("F6"));
        Console.WriteLine($"[QUERY] cosine_between_planes: cos({planes[0]}, {planes[1]}) = {cosine:F6}");
    }
}

public class SineBetweenLineAndPlaneQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.sine_between_line_and_plane;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count < 2) return;

        var line = QueryGeometryHelper.ResolveLine(context, objects[0]);
        var plane = QueryGeometryHelper.ResolvePlane(context, objects[1]);
        if (objects.Count >= 2 && line == null && plane != null)
        {
            line = QueryGeometryHelper.ResolveLine(context, objects[1]);
            plane = QueryGeometryHelper.ResolvePlane(context, objects[0]);
        }

        if (line == null || plane == null) return;

        double angleDeg = plane.AngleWithLine(line);
        double sine = Math.Sin(angleDeg * Math.PI / 180.0);
        QueryGeometryHelper.StoreResult(context, query.Id, "sine", sine.ToString("F6"));
        Console.WriteLine($"[QUERY] sine_between_line_and_plane: sin({objects[0]}, {objects[1]}) = {sine:F6}");
    }
}

public class RatioVolumeQueryHandler : IQueryHandler
{
    public QueryType TargetQueryType => QueryType.ratio_volume;

    public void Handle(QueryDto query, GeometryProblemDto problem, CompilationContext context)
    {
        var data = query.GetDataAs<RatioVolumeQueryData>();
        var solids = data?.Solids ?? [];

        if (solids.Count < 2 &&
            query.Data.ValueKind == System.Text.Json.JsonValueKind.Object &&
            query.Data.TryGetProperty("solids", out var solidsProp) &&
            solidsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            solids = solidsProp.EnumerateArray()
                .Select(x => x.GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .ToList();
        }

        if (solids.Count < 2) return;

        QueryGeometryHelper.StoreResult(context, query.Id, "ratio_volume", $"{solids[0]}:{solids[1]} ({FactGeometryHelper.InferVolumeShape(solids[0])}/{FactGeometryHelper.InferVolumeShape(solids[1])})");
        Console.WriteLine($"[QUERY] ratio_volume: {solids[0]} / {solids[1]}");
    }
}
