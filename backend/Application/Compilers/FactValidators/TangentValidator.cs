using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class TangentValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Tangent;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<TangentData>();
        if (data?.Objects == null || data.Objects.Count < 2)
            return ValidationResult.Skip(fact.Id, "Tangent", "Thiếu dữ liệu objects");

        var obj1 = NormalizeName(data.Objects[0]);
        var obj2 = NormalizeName(data.Objects[1]);

        var plane = context.GetPlane(obj1) ?? context.GetPlane(obj2);
        var sphere = FindSphere(context, obj1, obj2);

        if (plane != null && sphere != null)
            return ValidatePlaneSphereTangent(fact.Id, plane, sphere, data.Point, context);

        var circle = context.Circles.FirstOrDefault(c =>
            c.Center == obj1 || c.Center == obj2 ||
            data.Objects.Any(o => NormalizeName(o) == c.Center));

        if (plane != null && circle != null && !string.IsNullOrWhiteSpace(data.Point))
            return ValidatePlaneCircleTangent(fact.Id, plane, circle, data.Point, context);

        return ValidationResult.Skip(fact.Id, "Tangent", $"Chưa hỗ trợ kiểm tra tiếp tuyến giữa {obj1} và {obj2}");
    }

    private static ValidationResult ValidatePlaneSphereTangent(
        string factId,
        Plane3D plane,
        SphereData sphere,
        string? tangentPointName,
        CompilationContext context)
    {
        var center = context.GetPoint(sphere.Center);
        if (center == null)
            return ValidationResult.Skip(factId, "Tangent", $"Chưa có tọa độ tâm cầu {sphere.Center}");

        double centerToPlane = plane.DistanceToPoint(center);
        double radiusDiff = Math.Abs(centerToPlane - sphere.Radius);

        if (string.IsNullOrWhiteSpace(tangentPointName))
        {
            if (radiusDiff <= 0.05)
                return ValidationResult.Pass(factId, "Tangent", sphere.Radius, centerToPlane);
            return ValidationResult.Fail(factId, "Tangent", sphere.Radius, centerToPlane);
        }

        var tangentPoint = context.GetPoint(tangentPointName);
        if (tangentPoint == null)
            return ValidationResult.Skip(factId, "Tangent", $"Chưa có tọa độ điểm tiếp xúc {tangentPointName}");

        double pointToCenter = tangentPoint.DistanceToPoint(center);
        double pointToPlane = plane.DistanceToPoint(tangentPoint);
        double radiusError = Math.Abs(pointToCenter - sphere.Radius);
        double maxError = Math.Max(radiusDiff, Math.Max(radiusError, pointToPlane));

        if (maxError <= 0.05)
            return ValidationResult.Pass(factId, "Tangent", sphere.Radius, maxError);

        return ValidationResult.Fail(factId, "Tangent", sphere.Radius, maxError);
    }

    private static ValidationResult ValidatePlaneCircleTangent(
        string factId,
        Plane3D plane,
        CircleData circle,
        string tangentPointName,
        CompilationContext context)
    {
        var center = context.GetPoint(circle.Center);
        var tangentPoint = context.GetPoint(tangentPointName);
        if (center == null || tangentPoint == null)
            return ValidationResult.Skip(factId, "Tangent", "Chưa có đủ tọa độ tâm/tr điểm tiếp xúc");

        double pointToCenter = tangentPoint.DistanceToPoint(center);
        double pointToPlane = plane.DistanceToPoint(tangentPoint);
        double radiusError = Math.Abs(pointToCenter - circle.Radius);
        double maxError = Math.Max(radiusError, pointToPlane);

        if (maxError <= 0.05)
            return ValidationResult.Pass(factId, "Tangent", circle.Radius, maxError);

        return ValidationResult.Fail(factId, "Tangent", circle.Radius, maxError);
    }

    private static SphereData? FindSphere(CompilationContext context, string obj1, string obj2)
    {
        return context.Spheres.FirstOrDefault(s =>
            s.Center == obj1 || s.Center == obj2 ||
            obj1.Contains(s.Center, StringComparison.Ordinal) ||
            obj2.Contains(s.Center, StringComparison.Ordinal));
    }

    private static string NormalizeName(string name) =>
        name.Replace("(", string.Empty).Replace(")", string.Empty).Trim();
}
