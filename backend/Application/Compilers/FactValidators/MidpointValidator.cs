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

        var p1 = context.GetPoint(segment[0].ToString());
        var p2 = context.GetPoint(segment[1].ToString());

        if (p1 == null || p2 == null)
            return ValidationResult.Skip(fact.Id, "Midpoint", $"Chưa có tọa độ điểm {segment[0]} hoặc {segment[1]}");

        var expectedMid = p1.GetMidpoint(p2);
        double distance = actualMid.DistanceToPoint(expectedMid);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Midpoint", 0, distance);

        return ValidationResult.Fail(fact.Id, "Midpoint", 0, distance);
    }
}
