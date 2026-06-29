using System;
using System.Linq;
using System.Collections.Generic;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class ParallelValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Parallel;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<ObjectsData>();
        if (data == null || data.Objects == null || data.Objects.Count < 2)
            return ValidationResult.Skip(fact.Id, "Parallel", "Thiếu dữ liệu objects");

        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        int c1 = CountVertices(obj1);
        int c2 = CountVertices(obj2);

        if (c1 == 2 && c2 == 2)
        {
            var line1 = context.GetLine(obj1);
            var line2 = context.GetLine(obj2);
            if (line1 == null || line2 == null)
                return ValidationResult.Skip(fact.Id, "Parallel", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool parallel = line1.Direction.CrossProduct(line2.Direction).Magnitude() < 1e-4;
            return parallel
                ? ValidationResult.Pass(fact.Id, "Parallel", 0, 0)
                : ValidationResult.Fail(fact.Id, "Parallel", 0, 1);
        }

        if (c1 == 2 && c2 >= 3)
        {
            var line = context.GetLine(obj1);
            var plane = context.GetPlane(obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(fact.Id, "Parallel", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool parallel = Math.Abs(line.Direction.DotProduct(plane.Normal)) < 1e-4;
            return parallel
                ? ValidationResult.Pass(fact.Id, "Parallel", 0, 0)
                : ValidationResult.Fail(fact.Id, "Parallel", 0, 1);
        }

        if (c1 >= 3 && c2 == 2)
        {
            var plane = context.GetPlane(obj1);
            var line = context.GetLine(obj2);
            if (line == null || plane == null)
                return ValidationResult.Skip(fact.Id, "Parallel", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool parallel = Math.Abs(line.Direction.DotProduct(plane.Normal)) < 1e-4;
            return parallel
                ? ValidationResult.Pass(fact.Id, "Parallel", 0, 0)
                : ValidationResult.Fail(fact.Id, "Parallel", 0, 1);
        }

        if (c1 >= 3 && c2 >= 3)
        {
            var plane1 = context.GetPlane(obj1);
            var plane2 = context.GetPlane(obj2);
            if (plane1 == null || plane2 == null)
                return ValidationResult.Skip(fact.Id, "Parallel", $"Chưa có đủ tọa độ cho {obj1} hoặc {obj2}");

            bool parallel = plane1.Normal.CrossProduct(plane2.Normal).Magnitude() < 1e-4;
            return parallel
                ? ValidationResult.Pass(fact.Id, "Parallel", 0, 0)
                : ValidationResult.Fail(fact.Id, "Parallel", 0, 1);
        }

        return ValidationResult.Skip(fact.Id, "Parallel", $"Không nhận dạng được loại đối tượng: {obj1}, {obj2}");
    }

    private static int CountVertices(string input)
    {
        return System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*")
            .Cast<System.Text.RegularExpressions.Match>()
            .Count();
    }
}
