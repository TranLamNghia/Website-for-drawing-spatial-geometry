using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class OrthocenterValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Orthocenter;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ShapeTargetData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Point) || string.IsNullOrWhiteSpace(data.Shape))
            return ValidationResult.Skip(fact.Id, "Orthocenter", "Thiếu dữ liệu point/shape");

        var actualPoint = context.GetPoint(data.Point);
        if (actualPoint == null)
            return ValidationResult.Skip(fact.Id, "Orthocenter", $"Chưa có tọa độ điểm {data.Point}");

        var points = context.GetPointsFromPlane(data.Shape);
        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Orthocenter", $"Chưa có đủ tọa độ cho hình {data.Shape}");

        var expected = Point3D.GetOrthocenter(points[0], points[1], points[2]);
        double distance = actualPoint.DistanceToPoint(expected);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Orthocenter", 0, distance);

        return ValidationResult.Fail(fact.Id, "Orthocenter", 0, distance);
    }
}
