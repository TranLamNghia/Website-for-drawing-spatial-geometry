using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Thực thể: Trọng tâm
/// VD: Fact "O là trọng tâm tam giác ABC" → Check O == (A+B+C)/3
/// </summary>
public class CentroidValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Centroid;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ObjectsData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || data.Objects == null || data.Objects.Count == 0)
            return ValidationResult.Skip(fact.Id, "Centroid", "Thiếu dữ liệu point/objects");

        string pointName = data.Point;
        string polygon = data.Objects[0];

        var actualPoint = context.GetPoint(pointName);
        if (actualPoint == null)
            return ValidationResult.Skip(fact.Id, "Centroid", $"Chưa có tọa độ điểm {pointName}");

        var polyPoints = context.GetPointsFromPlane(polygon);
        if (polyPoints.Count < 3)
            return ValidationResult.Skip(fact.Id, "Centroid", $"Chưa có đủ tọa độ cho đa giác {polygon}");

        var expectedCentroid = Point3D.GetCentroid(polyPoints.ToArray());
        double distance = actualPoint.DistanceToPoint(expectedCentroid);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Centroid", 0, distance);

        return ValidationResult.Fail(fact.Id, "Centroid", 0, distance);
    }
}
