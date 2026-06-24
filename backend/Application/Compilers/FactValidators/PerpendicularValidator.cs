using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class PerpendicularValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Perpendicular;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ObjectsData>();
        if (data == null || data.Objects == null || data.Objects.Count < 2)
            return ValidationResult.Skip(fact.Id, "Perpendicular", "Thiếu dữ liệu objects");

        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        int c1 = CountVertices(obj1);
        int c2 = CountVertices(obj2);

        if (c1 == 2 && c2 == 2)
        {
            var line1 = context.GetLine(obj1);
            var line2 = context.GetLine(obj2);
            if (line1 == null || line2 == null)
                return ValidationResult.Skip(fact.Id, "Perpendicular", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool perpendicular = Math.Abs(line1.Direction.DotProduct(line2.Direction)) < 1e-2;
            return perpendicular
                ? ValidationResult.Pass(fact.Id, "Perpendicular", 0, 0)
                : ValidationResult.Fail(fact.Id, "Perpendicular", 0, 1);
        }

        if (c1 == 2 && c2 >= 3)
        {
            var line = context.GetLine(obj1);
            var plane = context.GetPlane(obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(fact.Id, "Perpendicular", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool perpendicular = line.Direction.CrossProduct(plane.Normal).Magnitude() < 1e-4;
            return perpendicular
                ? ValidationResult.Pass(fact.Id, "Perpendicular", 0, 0)
                : ValidationResult.Fail(fact.Id, "Perpendicular", 0, 1);
        }

        if (c1 >= 3 && c2 == 2)
        {
            var plane = context.GetPlane(obj1);
            var line = context.GetLine(obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(fact.Id, "Perpendicular", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool perpendicular = line.Direction.CrossProduct(plane.Normal).Magnitude() < 1e-4;
            return perpendicular
                ? ValidationResult.Pass(fact.Id, "Perpendicular", 0, 0)
                : ValidationResult.Fail(fact.Id, "Perpendicular", 0, 1);
        }

        if (c1 >= 3 && c2 >= 3)
        {
            var plane1 = context.GetPlane(obj1);
            var plane2 = context.GetPlane(obj2);
            if (plane1 == null || plane2 == null)
                return ValidationResult.Skip(fact.Id, "Perpendicular", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool perpendicular = Math.Abs(plane1.Normal.DotProduct(plane2.Normal)) < 1e-4;
            return perpendicular
                ? ValidationResult.Pass(fact.Id, "Perpendicular", 0, 0)
                : ValidationResult.Fail(fact.Id, "Perpendicular", 0, 1);
        }

        return ValidationResult.Skip(fact.Id, "Perpendicular", $"Không nhận dạng được loại đối tượng: {obj1}, {obj2}");
    }

    private static int CountVertices(string input)
    {
        return System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*")
            .Cast<System.Text.RegularExpressions.Match>()
            .Count();
    }
}
