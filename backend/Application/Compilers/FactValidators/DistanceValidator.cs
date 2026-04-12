using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Ràng buộc: Khoảng cách (điểm-điểm, điểm-đường, điểm-mp, đường-đường)
/// VD: "Khoảng cách giữa AC và SB bằng a"
/// </summary>
public class DistanceValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Distance;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<DistanceData>();
        if (data == null || string.IsNullOrEmpty(data.From) || string.IsNullOrEmpty(data.To) || string.IsNullOrEmpty(data.Value))
            return ValidationResult.Skip(fact.Id, "Distance", "Thiếu dữ liệu from/to/value");

        string from = data.From;
        string to = data.To;

        var fromVertices = System.Text.RegularExpressions.Regex.Matches(from, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        var toVertices = System.Text.RegularExpressions.Regex.Matches(to, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        double actualDistance = -1;

        // Case 1: Khoảng cách giữa 2 điểm (from="A", to="B")
        if (fromVertices.Count == 1 && toVertices.Count == 1)
        {
            var p1 = context.GetPoint(fromVertices[0]);
            var p2 = context.GetPoint(toVertices[0]);
            if (p1 == null || p2 == null)
                return ValidationResult.Skip(fact.Id, "Distance", $"Chưa có tọa độ {from} hoặc {to}");
            actualDistance = p1.DistanceToPoint(p2);
        }
        // Case 2: Khoảng cách giữa 2 đường thẳng (from="AC", to="SB")
        else if (fromVertices.Count == 2 && toVertices.Count == 2)
        {
            var line1 = context.GetLine(from);
            var line2 = context.GetLine(to);
            if (line1 == null || line2 == null)
                return ValidationResult.Skip(fact.Id, "Distance", $"Chưa có đủ tọa độ cho {from} hoặc {to}");
            actualDistance = line1.DistanceToLine(line2);
        }
        // Case 3: Khoảng cách từ điểm đến đường thẳng (from="A", to="BC")
        else if (fromVertices.Count == 1 && toVertices.Count == 2)
        {
            var p = context.GetPoint(fromVertices[0]);
            var line = context.GetLine(to);
            if (p == null || line == null)
                return ValidationResult.Skip(fact.Id, "Distance", $"Chưa có tọa độ cho {from} hoặc {to}");
            actualDistance = line.DistanceToPoint(p);
        }
        // Case 4: Khoảng cách từ điểm đến mặt phẳng (from="S", to="ABCD")
        else if (fromVertices.Count == 1 && toVertices.Count >= 3)
        {
            var p = context.GetPoint(fromVertices[0]);
            var plane = context.GetPlane(to);
            if (p == null || plane == null)
                return ValidationResult.Skip(fact.Id, "Distance", $"Chưa có tọa độ cho {from} hoặc {to}");
            actualDistance = plane.DistanceToPoint(p);
        }
        else
        {
            return ValidationResult.Skip(fact.Id, "Distance", $"Không nhận dạng được loại khoảng cách: {from} -> {to}");
        }

        double expectedDistance = EvaluateExpression(data.Value, unitLength);

        double tolerance = expectedDistance * 0.01;
        if (Math.Abs(expectedDistance - actualDistance) <= Math.Max(tolerance, 0.05))
            return ValidationResult.Pass(fact.Id, "Distance", expectedDistance, actualDistance);

        return ValidationResult.Fail(fact.Id, "Distance", expectedDistance, actualDistance);
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
