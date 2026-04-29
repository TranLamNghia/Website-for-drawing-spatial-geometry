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
        double k = 0.5; // Mặc định

        // Giả sử Value là con số (Cần logic EvaluateExpression nếu muốn động)
        if (double.TryParse(data.Value, out double val)) k = val;

        // Trường hợp 1: AX = k * AB (X là điểm mới)
        var v1 = System.Text.RegularExpressions.Regex.Matches(s1, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        var v2 = System.Text.RegularExpressions.Regex.Matches(s2, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        // Trường hợp 1: AX = k * AB (X là điểm mới)
        if (v1.Count >= 2 && v2.Count >= 2 && v1[0] == v2[0]) 
        {
            string start = v1[0];
            string end = v2[1];
            string target = v1[1];

            if (!context.Points.ContainsKey(target))
            {
                var pStart = context.GetPoint(start);
                var pEnd = context.GetPoint(end);
                if (pStart != null && pEnd != null)
                {
                    context.Points[target] = pStart.GetPointAtRatio(pEnd, k);
                    Console.WriteLine($"[HANDLER] Đã dựng điểm {target} theo tỉ lệ {k} trên {start}{end}");
                }
            }
        }
    }
}
