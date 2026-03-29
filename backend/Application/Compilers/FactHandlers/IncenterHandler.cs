using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class IncenterHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Incenter;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ShapeTargetData>(); 
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Shape)) return;

        string iPoint = data.Point;
        string triangle = data.Shape;

        if (!context.Points.ContainsKey(iPoint))
        {
            var points = context.GetPointsFromPlane(triangle);

            if (points.Count >= 3)
            {
                context.Points[iPoint] = Point3D.GetIncenter(points[0], points[1], points[2]);
                Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {iPoint} của tam giác {triangle}");
            }
        }
    }
}
