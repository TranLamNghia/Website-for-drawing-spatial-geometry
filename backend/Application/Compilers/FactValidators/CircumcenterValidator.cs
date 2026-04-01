using System;
using System.Collections.Generic;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Thực thể: Tâm (Ngoại tiếp tam giác hoặc Giao điểm đường chéo tứ giác)
/// VD: Fact "O là tâm hình thoi ABCD" -> Check O == Midpoint(A, C)
/// </summary>
public class CircumcenterValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Circumcenter;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ShapeTargetData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Shape))
            return ValidationResult.Skip(fact.Id, "Circumcenter", "Thiếu dữ liệu point/shape");

        string pointName = data.Point;
        string shapeName = data.Shape;

        var actualPoint = context.GetPoint(pointName);
        if (actualPoint == null)
            return ValidationResult.Skip(fact.Id, "Circumcenter", $"Chưa có tọa độ điểm {pointName}");

        var points = context.GetPointsFromPlane(shapeName);
        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Circumcenter", $"Chưa có đủ tọa độ cho hình {shapeName}");

        Point3D expectedCenter = Point3D.GetCircumcenter(points.ToArray());

        double distance = actualPoint.DistanceToPoint(expectedCenter);
        double tolerance = 0.05; // Ngưỡng sai số 0.05 đơn vị

        if (distance <= tolerance)
            return ValidationResult.Pass(fact.Id, "Circumcenter", 0, distance);

        return ValidationResult.Fail(fact.Id, "Circumcenter", 0, distance);
    }
}
