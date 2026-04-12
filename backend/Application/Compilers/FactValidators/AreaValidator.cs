using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

/// <summary>
/// Kiểm định Ràng buộc: Diện tích
/// VD: Fact "Diện tích SBD = 6" → Tính diện tích tam giác SBD từ tọa độ 3D
/// </summary>
public class AreaValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Area;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<LengthData>(); // Area dùng cùng format {target, value}
        if (data == null || string.IsNullOrEmpty(data.Target) || string.IsNullOrEmpty(data.Value))
            return ValidationResult.Skip(fact.Id, "Area", "Thiếu dữ liệu target/value");

        string target = data.Target;
        var vertices = System.Text.RegularExpressions.Regex.Matches(target, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        
        if (vertices.Count < 3)
            return ValidationResult.Skip(fact.Id, "Area", $"Target '{target}' không đủ 3 đỉnh để tính diện tích");

        // Lấy tọa độ các điểm 
        var points = new System.Collections.Generic.List<Point3D>();
        foreach (string v in vertices)
        {
            var p = context.GetPoint(v);
            if (p == null)
                return ValidationResult.Skip(fact.Id, "Area", $"Chưa có tọa độ điểm {v}");
            points.Add(p);
        }

        // Tính diện tích thực tế (Chia đa giác thanh tam giác quạt)
        double actualArea = 0;
        for (int i = 1; i < points.Count - 1; i++)
        {
            actualArea += Point3D.GetTriangleArea(points[0], points[i], points[i + 1]);
        }

        double expectedArea = EvaluateExpression(data.Value, unitLength);
        
        double tolerance = expectedArea * 0.01;
        if (Math.Abs(expectedArea - actualArea) <= Math.Max(tolerance, 0.05))
            return ValidationResult.Pass(fact.Id, "Area", expectedArea, actualArea);

        return ValidationResult.Fail(fact.Id, "Area", expectedArea, actualArea);
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
