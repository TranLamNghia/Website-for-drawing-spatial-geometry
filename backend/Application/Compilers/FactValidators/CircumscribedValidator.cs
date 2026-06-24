using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class CircumscribedValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Circumscribed;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<CircumscribedData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Outer))
            return ValidationResult.Skip(fact.Id, "Circumscribed", "Thiếu dữ liệu outer");

        var actualCenter = context.GetPoint(data.Outer);
        if (actualCenter == null)
            return ValidationResult.Skip(fact.Id, "Circumscribed", $"Chưa có tọa độ điểm {data.Outer}");

        string shapeExpr = !string.IsNullOrWhiteSpace(data.Inner)
            ? data.Inner
            : data.Points != null && data.Points.Count > 0
                ? string.Concat(data.Points)
                : string.Empty;

        if (string.IsNullOrWhiteSpace(shapeExpr))
            return ValidationResult.Skip(fact.Id, "Circumscribed", "Thiếu dữ liệu inner/points");

        var points = context.GetPointsFromPlane(shapeExpr);
        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Circumscribed", $"Chưa có đủ tọa độ cho hình {shapeExpr}");

        var expectedCenter = Point3D.GetCircumcenter(points.ToArray());
        if (expectedCenter == null)
            return ValidationResult.Skip(fact.Id, "Circumscribed", "Lỗi tính tâm ngoại tiếp");

        double distance = actualCenter.DistanceToPoint(expectedCenter);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Circumscribed", 0, distance);

        return ValidationResult.Fail(fact.Id, "Circumscribed", 0, distance);
    }
}
