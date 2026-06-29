using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class EqualityValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Equality;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<EqualityData>();
        string left;
        string right;

        if (data != null)
        {
            left = data.Left ?? data.Objects?.ElementAtOrDefault(0) ?? string.Empty;
            right = data.Right ?? data.Objects?.ElementAtOrDefault(1) ?? string.Empty;
        }
        else
        {
            var fallback = fact.GetDataAs<ObjectsData>();
            left = fallback?.Objects.ElementAtOrDefault(0) ?? string.Empty;
            right = fallback?.Objects.ElementAtOrDefault(1) ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
            return ValidationResult.Skip(fact.Id, "Equality", "Thiếu dữ liệu left/right");

        var leftPoints = FactGeometryHelper.GetPoints(context, left);
        var rightPoints = FactGeometryHelper.GetPoints(context, right);

        if (leftPoints.Count == 0 || rightPoints.Count == 0)
            return ValidationResult.Skip(fact.Id, "Equality", $"Chưa có đủ tọa độ cho {left} hoặc {right}");

        double diff;

        if (leftPoints.Count == 1 && rightPoints.Count == 1)
        {
            diff = leftPoints[0].DistanceToPoint(rightPoints[0]);
        }
        else if (leftPoints.Count == 2 && rightPoints.Count == 2)
        {
            diff = Math.Abs(leftPoints[0].DistanceToPoint(leftPoints[1]) - rightPoints[0].DistanceToPoint(rightPoints[1]));
        }
        else if (leftPoints.Count >= 3 && rightPoints.Count >= 3)
        {
            double areaDiff = Math.Abs(FactGeometryHelper.PolygonArea(leftPoints) - FactGeometryHelper.PolygonArea(rightPoints));
            double perimDiff = Math.Abs(FactGeometryHelper.PolygonPerimeter(leftPoints) - FactGeometryHelper.PolygonPerimeter(rightPoints));
            diff = Math.Max(areaDiff, perimDiff);
        }
        else
        {
            return ValidationResult.Skip(fact.Id, "Equality", $"Chưa hỗ trợ so sánh giữa {left} và {right}");
        }

        if (diff <= 0.05)
            return ValidationResult.Pass(fact.Id, "Equality", 0, diff);

        return ValidationResult.Fail(fact.Id, "Equality", 0, diff);
    }
}
