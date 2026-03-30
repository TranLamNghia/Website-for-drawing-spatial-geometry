using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class CircumscribedHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Circumscribed;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<CircumscribedData>();
        if (data == null || string.IsNullOrEmpty(data.Outer) || string.IsNullOrEmpty(data.Inner)) return;

        string spherePoint = data.Outer; // Giả sử AI bóc tách tâm là Outer (hoặc 1 điểm mới)
        string solid = data.Inner;

        if (!context.Points.ContainsKey(spherePoint))
        {
            var points = context.GetPointsFromPlane(solid);
            if (points.Count >= 4)
            {
                var sphere = Sphere3D.GetCircumsphere(points[0], points[1], points[2], points[3]);
                context.Points[spherePoint] = sphere.Center;
                Console.WriteLine($"[HANDLER] Đã dựng tâm mặt cầu ngoại tiếp {spherePoint} của {solid}");
            }
        }
    }
}
