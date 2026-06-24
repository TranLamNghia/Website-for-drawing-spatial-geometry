using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Application.DTOs.Queries;
using Application.Compilers.FactValidators;
using Domains.MathCore;

namespace Application.Compilers.QueryValidators;

public class ShapeQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.shape;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (!string.IsNullOrEmpty(target) && target.StartsWith("cross_section", StringComparison.OrdinalIgnoreCase))
        {
            return context.Sections.Count > 0 || context.CrossSectionPoints.Count > 0
                ? ValidationResult.Pass(query.Id, "shape", 1, 1)
                : ValidationResult.Skip(query.Id, "shape", "Chưa có thiết diện được dựng");
        }

        var (solid, plane) = QueryGeometryHelper.GetCrossSectionTargets(query, problem);
        if (!string.IsNullOrEmpty(plane) && QueryGeometryHelper.HasEnoughPoints(context, plane))
            return ValidationResult.Pass(query.Id, "shape", 1, 1);

        return ValidationResult.Skip(query.Id, "shape", "Thiếu dữ liệu solid/plane cho query shape");
    }
}

public class IntersectionLineQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.intersection_line;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var planes = QueryGeometryHelper.GetPlanes(query);
        if (planes.Count < 2)
        {
            var objects = QueryGeometryHelper.GetObjects(query);
            if (objects.Count >= 2) planes = objects;
        }

        if (planes.Count < 2)
            return ValidationResult.Skip(query.Id, "intersection_line", "Thiếu 2 mặt phẳng");

        var p1 = QueryGeometryHelper.ResolvePlane(context, planes[0]);
        var p2 = QueryGeometryHelper.ResolvePlane(context, planes[1]);
        if (p1 == null || p2 == null)
            return ValidationResult.Skip(query.Id, "intersection_line", "Chưa có đủ tọa độ mặt phẳng");

        var line = p1.IntersectWith(p2);
        return line != null
            ? ValidationResult.Pass(query.Id, "intersection_line", 1, 1)
            : ValidationResult.Fail(query.Id, "intersection_line", 1, 0);
    }
}

public class EquationLineQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.equation_line;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target))
            return ValidationResult.Skip(query.Id, "equation_line", "Thiếu target");

        return QueryGeometryHelper.ResolveLine(context, target) != null
            ? ValidationResult.Pass(query.Id, "equation_line", 1, 1)
            : ValidationResult.Skip(query.Id, "equation_line", $"Chưa dựng được đường {target}");
    }
}

public class EquationPlaneQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.equation_plane;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target))
            return ValidationResult.Skip(query.Id, "equation_plane", "Thiếu target");

        return QueryGeometryHelper.ResolvePlane(context, target) != null
            ? ValidationResult.Pass(query.Id, "equation_plane", 1, 1)
            : ValidationResult.Skip(query.Id, "equation_plane", $"Chưa dựng được mặt phẳng {target}");
    }
}

public class EquationSphereQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.equation_sphere;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target))
            return ValidationResult.Skip(query.Id, "equation_sphere", "Thiếu target");

        return QueryGeometryHelper.ResolveSphere(context, target) != null
            ? ValidationResult.Pass(query.Id, "equation_sphere", 1, 1)
            : ValidationResult.Skip(query.Id, "equation_sphere", $"Chưa dựng được mặt cầu {target}");
    }
}

public class CoordinatesQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.coordinates;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrEmpty(target))
            return ValidationResult.Skip(query.Id, "coordinates", "Thiếu target");

        return context.GetPoint(target) != null
            ? ValidationResult.Pass(query.Id, "coordinates", 1, 1)
            : ValidationResult.Skip(query.Id, "coordinates", $"Chưa có tọa độ điểm {target}");
    }
}

public class LocusQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.locus;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var target = QueryGeometryHelper.GetTarget(query);
        if (string.IsNullOrWhiteSpace(target))
            return ValidationResult.Skip(query.Id, "locus", "Thiếu target");

        return ValidationResult.Pass(query.Id, "locus", 1, 1);
    }
}

public class ProofParallelQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.proof_parallel;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count < 2)
            return ValidationResult.Skip(query.Id, "proof_parallel", "Thiếu objects");

        return ValidateParallel(query.Id, "proof_parallel", objects[0], objects[1], context);
    }

    internal static ValidationResult ValidateParallel(string id, string type, string obj1, string obj2, CompilationContext context)
    {
        int c1 = QueryGeometryHelper.CountVertices(obj1);
        int c2 = QueryGeometryHelper.CountVertices(obj2);

        if (c1 == 2 && c2 == 2)
        {
            var line1 = context.GetLine(obj1);
            var line2 = context.GetLine(obj2);
            if (line1 == null || line2 == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool parallel = line1.Direction.CrossProduct(line2.Direction).Magnitude() < 1e-4;
            return parallel ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        if ((c1 == 2 && c2 >= 3) || (c1 >= 3 && c2 == 2))
        {
            var line = context.GetLine(c1 == 2 ? obj1 : obj2);
            var plane = context.GetPlane(c1 >= 3 ? obj1 : obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool parallel = Math.Abs(line.Direction.DotProduct(plane.Normal)) < 1e-4;
            return parallel ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        if (c1 >= 3 && c2 >= 3)
        {
            var plane1 = context.GetPlane(obj1);
            var plane2 = context.GetPlane(obj2);
            if (plane1 == null || plane2 == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool parallel = plane1.Normal.CrossProduct(plane2.Normal).Magnitude() < 1e-4;
            return parallel ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        return ValidationResult.Skip(id, type, "Không nhận dạng được đối tượng");
    }
}

public class ProofPerpendicularQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.proof_perpendicular;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count < 2)
            return ValidationResult.Skip(query.Id, "proof_perpendicular", "Thiếu objects");

        return ValidatePerpendicular(query.Id, "proof_perpendicular", objects[0], objects[1], context);
    }

    internal static ValidationResult ValidatePerpendicular(string id, string type, string obj1, string obj2, CompilationContext context)
    {
        int c1 = QueryGeometryHelper.CountVertices(obj1);
        int c2 = QueryGeometryHelper.CountVertices(obj2);

        if (c1 == 2 && c2 == 2)
        {
            var line1 = context.GetLine(obj1);
            var line2 = context.GetLine(obj2);
            if (line1 == null || line2 == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool perpendicular = Math.Abs(line1.Direction.DotProduct(line2.Direction)) < 1e-4;
            return perpendicular ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        if (c1 == 2 && c2 >= 3)
        {
            var line = context.GetLine(obj1);
            var plane = context.GetPlane(obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool perpendicular = line.Direction.CrossProduct(plane.Normal).Magnitude() < 1e-4;
            return perpendicular ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        if (c1 >= 3 && c2 == 2)
            return ValidatePerpendicular(id, type, obj2, obj1, context);

        if (c1 >= 3 && c2 >= 3)
        {
            var plane1 = context.GetPlane(obj1);
            var plane2 = context.GetPlane(obj2);
            if (plane1 == null || plane2 == null)
                return ValidationResult.Skip(id, type, "Chưa có đủ tọa độ");

            bool perpendicular = Math.Abs(plane1.Normal.DotProduct(plane2.Normal)) < 1e-4;
            return perpendicular ? ValidationResult.Pass(id, type, 0, 0) : ValidationResult.Fail(id, type, 0, 1);
        }

        return ValidationResult.Skip(id, type, "Không nhận dạng được đối tượng");
    }
}

public class ProofEqualQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.proof_equal;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count < 2)
            return ValidationResult.Skip(query.Id, "proof_equal", "Thiếu objects");

        var fact = new FactDto
        {
            Id = query.Id,
            Type = FactType.Equality,
            Data = System.Text.Json.JsonSerializer.SerializeToElement(new EqualityData { Objects = objects })
        };

        var result = new EqualityValidator().Validate(fact, context, unitLength);
        return new ValidationResult
        {
            FactId = query.Id,
            FactType = "proof_equal",
            IsValid = result.IsValid,
            ExpectedValue = result.ExpectedValue,
            ActualValue = result.ActualValue,
            Deviation = result.Deviation,
            Message = result.Message.Replace("Equality", "proof_equal", StringComparison.Ordinal)
        };
    }
}

public class CosineBetweenPlanesQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.cosine_between_planes;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var planes = QueryGeometryHelper.GetPlanes(query);
        if (planes.Count < 2)
            return ValidationResult.Skip(query.Id, "cosine_between_planes", "Thiếu planes");

        var p1 = QueryGeometryHelper.ResolvePlane(context, planes[0]);
        var p2 = QueryGeometryHelper.ResolvePlane(context, planes[1]);
        if (p1 == null || p2 == null)
            return ValidationResult.Skip(query.Id, "cosine_between_planes", "Chưa có đủ tọa độ mặt phẳng");

        double angle = p1.AngleWithPlane(p2);
        return ValidationResult.Pass(query.Id, "cosine_between_planes", Math.Cos(angle * Math.PI / 180.0), angle);
    }
}

public class SineBetweenLineAndPlaneQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.sine_between_line_and_plane;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var objects = QueryGeometryHelper.GetObjects(query);
        if (objects.Count < 2)
            return ValidationResult.Skip(query.Id, "sine_between_line_and_plane", "Thiếu objects");

        var line = QueryGeometryHelper.ResolveLine(context, objects[0]);
        var plane = QueryGeometryHelper.ResolvePlane(context, objects[1]);
        if (line == null || plane == null)
        {
            line = QueryGeometryHelper.ResolveLine(context, objects[1]);
            plane = QueryGeometryHelper.ResolvePlane(context, objects[0]);
        }

        if (line == null || plane == null)
            return ValidationResult.Skip(query.Id, "sine_between_line_and_plane", "Chưa có đủ tọa độ");

        double angle = plane.AngleWithLine(line);
        return ValidationResult.Pass(query.Id, "sine_between_line_and_plane", Math.Sin(angle * Math.PI / 180.0), angle);
    }
}

public class RatioVolumeQueryValidator : IQueryValidator
{
    public QueryType TargetQueryType => QueryType.ratio_volume;

    public ValidationResult Validate(QueryDto query, GeometryProblemDto problem, CompilationContext context, double unitLength)
    {
        var data = query.GetDataAs<RatioVolumeQueryData>();
        var solids = data?.Solids ?? [];
        if (solids.Count < 2)
            return ValidationResult.Skip(query.Id, "ratio_volume", "Thiếu solids");

        var pts1 = FactGeometryHelper.GetPoints(context, solids[0]);
        var pts2 = FactGeometryHelper.GetPoints(context, solids[1]);
        if (pts1.Count < 4 || pts2.Count < 4)
            return ValidationResult.Skip(query.Id, "ratio_volume", "Chưa có đủ đỉnh khối");

        return ValidationResult.Pass(query.Id, "ratio_volume", 1, 1);
    }
}
