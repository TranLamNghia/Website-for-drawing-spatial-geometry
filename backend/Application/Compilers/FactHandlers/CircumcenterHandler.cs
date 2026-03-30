using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class CircumcenterHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Circumcenter;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ShapeTargetData>(); 
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Shape)) return;

        string oPoint = data.Point;
        string triangle = data.Shape;

        if (!context.Points.ContainsKey(oPoint))
        {
            var points = context.GetPointsFromPlane(triangle);

            if (points.Count >= 3)
            {
                context.Points[oPoint] = Point3D.GetCircumcenter(points[0], points[1], points[2]);
                Console.WriteLine($"[HANDLER] Đã dựng tâm ngoại tiếp {oPoint} của tam giác {triangle}");
            }
        }
    }
}
