using System;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class BelongsToValidator : IFactValidator
{
    public FactType TargetFactType => FactType.belongs_to;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<BelongsToData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Target))
            return ValidationResult.Skip(fact.Id, "belongs_to", "Thiếu dữ liệu point/target");

        var actual = context.GetPoint(data.Point);
        if (actual == null)
            return ValidationResult.Skip(fact.Id, "belongs_to", $"Chưa có tọa độ điểm {data.Point}");

        var vertices = Regex.Matches(data.Target, @"[A-Z][0-9]*'*")
            .Cast<Match>()
            .Select(m => m.Value)
            .ToList();

        if (vertices.Count == 2)
        {
            var p1 = context.GetPoint(vertices[0]);
            var p2 = context.GetPoint(vertices[1]);
            if (p1 == null || p2 == null)
                return ValidationResult.Skip(fact.Id, "belongs_to", $"Chưa có tọa độ cho {data.Target}");

            var line = new Line3D(p1, p2);
            double distance = line.DistanceToPoint(actual);
            return distance <= 0.05
                ? ValidationResult.Pass(fact.Id, "belongs_to", 0, distance)
                : ValidationResult.Fail(fact.Id, "belongs_to", 0, distance);
        }

        if (vertices.Count >= 3)
        {
            var plane = context.GetPlane(data.Target);
            if (plane == null)
                return ValidationResult.Skip(fact.Id, "belongs_to", $"Chưa có mặt phẳng {data.Target}");

            double distance = Math.Abs(plane.DistanceToPoint(actual));
            return distance <= 0.05
                ? ValidationResult.Pass(fact.Id, "belongs_to", 0, distance)
                : ValidationResult.Fail(fact.Id, "belongs_to", 0, distance);
        }

        return ValidationResult.Skip(fact.Id, "belongs_to", $"Không nhận dạng target {data.Target}");
    }
}
