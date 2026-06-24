using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class RatioHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Ratio;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<RatioData>();
        if (data == null || string.IsNullOrEmpty(data.Segment1) || string.IsNullOrEmpty(data.Segment2)) return;

        // Phân tích VD: "AM / AB = 0.5" => S1="AM", S2="AB", Value="0.5" 
        // Ta cần tìm điểm CHƯA có trong context
        string s1 = data.Segment1;
        string s2 = data.Segment2;

        // Trường hợp 1: AX = k * AB (X là điểm mới)
        var v1 = System.Text.RegularExpressions.Regex.Matches(s1, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        var v2 = System.Text.RegularExpressions.Regex.Matches(s2, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        // Trường hợp 1: AX = k * AB (X là điểm mới)
        if (v1.Count >= 2 && v2.Count >= 2 && v1[0] == v2[0]) 
        {
            string start = v1[0];
            string end = v2[1];
            string target = v1[1];

            var pStart = context.GetPoint(start);
            var pEnd = context.GetPoint(end);
            if (pStart != null && pEnd != null && TryParseRatioValue(data.Value, out double k))
            {
                context.Points[target] = pStart.GetPointAtRatio(pEnd, k);
                Console.WriteLine($"[HANDLER] Đã dựng điểm {target} theo tỉ lệ {k} trên {start}{end}");
            }
        }
        // Trường hợp 2: AP / PB = k (P chia AB)
        else if (v1.Count == 2 && v2.Count == 2 && v1[1] == v2[0] && TryParseRatioValue(data.Value, out double apOverPb))
        {
            string start = v1[0];
            string target = v1[1];
            string end = v2[1];

            var pStart = context.GetPoint(start);
            var pEnd = context.GetPoint(end);
            if (pStart != null && pEnd != null)
            {
                double t = apOverPb / (1.0 + apOverPb);
                context.Points[target] = pStart.GetPointAtRatio(pEnd, t);
                Console.WriteLine($"[HANDLER] Đã dựng điểm {target} trên {start}{end} với AP/PB = {apOverPb}");
            }
        }
    }

    private static bool TryParseRatioValue(string value, out double ratio)
    {
        ratio = 0.5;
        if (string.IsNullOrWhiteSpace(value)) return false;

        if (double.TryParse(value, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out ratio))
            return true;

        var parts = value.Split('/');
        if (parts.Length == 2 &&
            double.TryParse(parts[0].Trim(), System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out double num) &&
            double.TryParse(parts[1].Trim(), System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out double den) &&
            Math.Abs(den) > 1e-9)
        {
            ratio = num / den;
            return true;
        }

        return false;
    }
}
