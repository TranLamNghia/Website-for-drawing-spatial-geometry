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

        if (!context.Points.ContainsKey(m) && segment.Length >= 2)
        {
            var p1 = context.GetPoint(segment[0].ToString());
            var p2 = context.GetPoint(segment[1].ToString());

            if (p1 != null && p2 != null)
            {
                context.Points[m] = p1.GetMidpoint(p2);
                Console.WriteLine($"[HANDLER] Đã dựng trung điểm {m} của {segment}");
            }
        }
    }
}