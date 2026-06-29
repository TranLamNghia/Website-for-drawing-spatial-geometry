using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class IncenterValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Incenter;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ShapeTargetData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Point) || string.IsNullOrWhiteSpace(data.Shape))
            return ValidationResult.Skip(fact.Id, "Incenter", "Thiếu dữ liệu point/shape");

        var actualPoint = context.GetPoint(data.Point);
        if (actualPoint == null)
            return ValidationResult.Skip(fact.Id, "Incenter", $"Chưa có tọa độ điểm {data.Point}");

        var points = context.GetPointsFromPlane(data.Shape);
        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Incenter", $"Chưa có đủ tọa độ cho hình {data.Shape}");

        var expected = Point3D.GetIncenter(points.ToArray()).Center;
        double distance = actualPoint.DistanceToPoint(expected);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Incenter", 0, distance);

        return ValidationResult.Fail(fact.Id, "Incenter", 0, distance);
    }
}
