using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Thực thể: Hình chiếu vuông góc
/// VD: Fact "H là hình chiếu của S lên (ABCD)" → Check:
///   1. H có nằm trên mặt phẳng ABCD không?
///   2. SH có vuông góc với (ABCD) không?
/// </summary>
public class ProjectionValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Projection;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ProjectionData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.From) || string.IsNullOrEmpty(data.Onto))
            return ValidationResult.Skip(fact.Id, "Projection", "Thiếu dữ liệu point/from/onto");

        string projName = data.Point;
        string fromName = data.From;
        string ontoName = data.Onto;

        var actualProj = context.GetPoint(projName);
        var fromPoint = context.GetPoint(fromName);

        if (actualProj == null || fromPoint == null)
            return ValidationResult.Skip(fact.Id, "Projection", $"Chưa có tọa độ {projName} hoặc {fromName}");

        // Chiếu lên mặt phẳng
        if (ontoName.Length >= 3)
        {
            var plane = context.GetPlane(ontoName);
            if (plane == null)
                return ValidationResult.Skip(fact.Id, "Projection", $"Chưa có đủ tọa độ cho mặt phẳng {ontoName}");

            var expectedProj = plane.GetProjection(fromPoint);
            double distance = actualProj.DistanceToPoint(expectedProj);

            if (distance <= 0.05)
                return ValidationResult.Pass(fact.Id, "Projection", 0, distance);

            return ValidationResult.Fail(fact.Id, "Projection", 0, distance);
        }
        // Chiếu lên đường thẳng
        else if (ontoName.Length == 2)
        {
            var line = context.GetLine(ontoName);
            if (line == null)
                return ValidationResult.Skip(fact.Id, "Projection", $"Chưa có đủ tọa độ cho đường thẳng {ontoName}");

            var expectedProj = line.GetProjection(fromPoint);
            double distance = actualProj.DistanceToPoint(expectedProj);

            if (distance <= 0.05)
                return ValidationResult.Pass(fact.Id, "Projection", 0, distance);

            return ValidationResult.Fail(fact.Id, "Projection", 0, distance);
        }

        return ValidationResult.Skip(fact.Id, "Projection", $"Không nhận dạng được loại chiếu: onto='{ontoName}'");
    }
}
