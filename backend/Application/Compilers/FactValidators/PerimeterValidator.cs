using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class PerimeterValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Perimeter;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var perimeterData = fact.GetDataAs<PerimeterData>();
        var lengthData = fact.GetDataAs<LengthData>();
        string target;
        string value;

        if (perimeterData != null)
        {
            target = perimeterData.Target;
            value = perimeterData.Value;
        }
        else if (lengthData != null)
        {
            target = lengthData.Target;
            value = lengthData.Value;
        }
        else
        {
            return ValidationResult.Skip(fact.Id, "Perimeter", "Thiếu dữ liệu target/value");
        }

        if (string.IsNullOrWhiteSpace(target) || string.IsNullOrWhiteSpace(value))
            return ValidationResult.Skip(fact.Id, "Perimeter", "Thiếu dữ liệu target/value");

        double actualPerimeter;
        var vertices = FactGeometryHelper.ParseVertices(target);

        if (vertices.Count >= 3)
        {
            var points = FactGeometryHelper.GetPoints(context, target);
            if (points.Count < vertices.Count)
                return ValidationResult.Skip(fact.Id, "Perimeter", $"Chưa có đủ tọa độ cho {target}");

            actualPerimeter = FactGeometryHelper.PolygonPerimeter(points);
        }
        else if (vertices.Count == 1)
        {
            var circle = context.Circles.FirstOrDefault(c => c.Center == vertices[0]);
            if (circle == null)
                return ValidationResult.Skip(fact.Id, "Perimeter", $"Chưa có đủ dữ liệu cho đường tròn tâm {vertices[0]}");

            actualPerimeter = 2 * Math.PI * circle.Radius;
        }
        else
        {
            return ValidationResult.Skip(fact.Id, "Perimeter", $"Không nhận dạng được target '{target}'");
        }

        double expectedPerimeter = FactGeometryHelper.EvaluateExpression(value, unitLength);
        double tolerance = expectedPerimeter * 0.01;

        if (Math.Abs(expectedPerimeter - actualPerimeter) <= Math.Max(tolerance, 0.05))
            return ValidationResult.Pass(fact.Id, "Perimeter", expectedPerimeter, actualPerimeter);

        return ValidationResult.Fail(fact.Id, "Perimeter", expectedPerimeter, actualPerimeter);
    }
}
