using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Ràng buộc: Độ dài đoạn thẳng
/// VD: Fact "AB = 2a" → Kiểm tra khoảng cách thực tế giữa A và B
/// </summary>
public class LengthValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Length;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<LengthData>();
        if (data == null || string.IsNullOrEmpty(data.Target) || string.IsNullOrEmpty(data.Value))
            return ValidationResult.Skip(fact.Id, "Length", "Thiếu dữ liệu target/value");

        string edge = data.Target;
        if (edge.Length < 2)
            return ValidationResult.Skip(fact.Id, "Length", $"Target '{edge}' quá ngắn");

        var p1 = context.GetPoint(edge[0].ToString());
        var p2 = context.GetPoint(edge[1].ToString());

        if (p1 == null || p2 == null)
            return ValidationResult.Skip(fact.Id, "Length", $"Chưa có tọa độ điểm {edge[0]} hoặc {edge[1]}");

        double expectedLength = EvaluateExpression(data.Value, unitLength);
        double actualLength = p1.DistanceToPoint(p2);

        double tolerance = expectedLength * 0.01; // Sai số 1%
        if (Math.Abs(expectedLength - actualLength) <= Math.Max(tolerance, 0.05))
            return ValidationResult.Pass(fact.Id, "Length", expectedLength, actualLength);

        return ValidationResult.Fail(fact.Id, "Length", expectedLength, actualLength);
    }

    private double EvaluateExpression(string expr, double a)
    {
        try
        {
            string sanitized = expr.ToLower().Replace(" ", "");
            sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"(\d)a", "$1*a");

            while (sanitized.Contains("sqrt("))
            {
                int start = sanitized.IndexOf("sqrt(");
                int end = FindClosingParen(sanitized, start + 4);
                if (end == -1) break;
                string inside = sanitized.Substring(start + 5, end - (start + 5));
                double insideVal = EvaluateExpression(inside, a);
                sanitized = sanitized.Substring(0, start) +
                            Math.Sqrt(insideVal).ToString(System.Globalization.CultureInfo.InvariantCulture) +
                            sanitized.Substring(end + 1);
            }

            sanitized = sanitized.Replace("a", a.ToString(System.Globalization.CultureInfo.InvariantCulture));
            var dt = new System.Data.DataTable();
            return Convert.ToDouble(dt.Compute(sanitized, ""));
        }
        catch { return a; }
    }

    private int FindClosingParen(string text, int openPos)
    {
        int pos = openPos, counter = 1;
        while (counter > 0 && pos < text.Length - 1) { char c = text[++pos]; if (c == '(') counter++; else if (c == ')') counter--; }
        return counter == 0 ? pos : -1;
    }
}
