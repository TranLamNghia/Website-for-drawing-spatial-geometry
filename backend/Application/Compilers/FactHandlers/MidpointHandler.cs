using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class MidpointHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Midpoint;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<MidpointData>(); 
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Segment)) return;

        string m = data.Point;
        string segment = data.Segment;

        if (!context.Points.ContainsKey(m))
        {
            var vertices = System.Text.RegularExpressions.Regex.Matches(segment, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(match => match.Value).ToList();
            if (vertices.Count >= 2)
            {
                var p1 = context.GetPoint(vertices[0]);
                var p2 = context.GetPoint(vertices[1]);

                if (p1 != null && p2 != null)
            {
                context.Points[m] = p1.GetMidpoint(p2);
                Console.WriteLine($"[HANDLER] Đã dựng trung điểm {m} của {segment}");
            }
        }
    }
}
}