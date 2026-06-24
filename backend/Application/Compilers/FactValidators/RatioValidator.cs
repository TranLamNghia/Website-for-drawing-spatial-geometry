using System;
using System.Linq;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định tỉ lệ chia đoạn.
/// Dùng cho các fact kiểu "AM / AB = 0.5" hoặc biến thể tương đương.
/// </summary>
public class RatioValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Ratio;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<RatioData>();
        if (data == null || string.IsNullOrEmpty(data.Segment1) || string.IsNullOrEmpty(data.Segment2) || string.IsNullOrEmpty(data.Value))
            return ValidationResult.Skip(fact.Id, "Ratio", "Thiếu dữ liệu segment/value");

        var v1 = Regex.Matches(data.Segment1, @"[A-Z][0-9]*'*").Cast<Match>().Select(m => m.Value).ToList();
        var v2 = Regex.Matches(data.Segment2, @"[A-Z][0-9]*'*").Cast<Match>().Select(m => m.Value).ToList();

        if (v1.Count < 2 || v2.Count < 2 || v1[0] != v2[0])
            return ValidationResult.Skip(fact.Id, "Ratio", "Không nhận dạng được dạng chia đoạn");

        string start = v1[0];
        string end = v2[1];
        string target = v1[1];

        var pStart = context.GetPoint(start);
        var pEnd = context.GetPoint(end);
        var pTarget = context.GetPoint(target);

        if (pStart == null || pEnd == null || pTarget == null)
            return ValidationResult.Skip(fact.Id, "Ratio", $"Thiếu tọa độ cho {start}, {end} hoặc {target}");

        if (!double.TryParse(data.Value, out double ratio))
            ratio = EvaluateExpression(data.Value, unitLength);

        var expectedPoint = pStart.GetPointAtRatio(pEnd, ratio);
        double distance = pTarget.DistanceToPoint(expectedPoint);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Ratio", 0, distance);

        return ValidationResult.Fail(fact.Id, "Ratio", 0, distance);
    }

    private double EvaluateExpression(string expr, double a)
    {
        try
        {
            string sanitized = expr.ToLower().Replace(" ", "");
            sanitized = Regex.Replace(sanitized, @"(\d)a", "$1*a");
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
        catch
        {
            return a;
        }
    }

    private int FindClosingParen(string text, int openPos)
    {
        int pos = openPos, counter = 1;
        while (counter > 0 && pos < text.Length - 1)
        {
            char c = text[++pos];
            if (c == '(') counter++;
            else if (c == ')') counter--;
        }

        return counter == 0 ? pos : -1;
    }
}
