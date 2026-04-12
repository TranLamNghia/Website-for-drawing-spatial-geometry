using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Thực thể: Trung điểm
/// VD: Fact "M là trung điểm AB" → Check M == (A+B)/2
/// </summary>
public class MidpointValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Midpoint;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<MidpointData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Segment))
            return ValidationResult.Skip(fact.Id, "Midpoint", "Thiếu dữ liệu point/segment");

        string midName = data.Point;
        string segment = data.Segment;

        if (segment.Length < 2)
            return ValidationResult.Skip(fact.Id, "Midpoint", $"Segment '{segment}' quá ngắn");

        var actualMid = context.GetPoint(midName);
        if (actualMid == null)
            return ValidationResult.Skip(fact.Id, "Midpoint", $"Chưa có tọa độ điểm {midName}");

        var vertices = System.Text.RegularExpressions.Regex.Matches(segment, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        if (vertices.Count < 2)
            return ValidationResult.Skip(fact.Id, "Midpoint", $"Segment '{segment}' không chứa đủ 2 đỉnh");

        var p1 = context.GetPoint(vertices[0]);
        var p2 = context.GetPoint(vertices[1]);

        if (p1 == null || p2 == null)
            return ValidationResult.Skip(fact.Id, "Midpoint", $"Chưa có tọa độ điểm {vertices[0]} hoặc {vertices[1]}");

        var expectedMid = p1.GetMidpoint(p2);
        double distance = actualMid.DistanceToPoint(expectedMid);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Midpoint", 0, distance);

        return ValidationResult.Fail(fact.Id, "Midpoint", 0, distance);
    }
}
