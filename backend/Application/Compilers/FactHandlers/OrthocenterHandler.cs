using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class OrthocenterHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Orthocenter;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ShapeTargetData>(); 
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Shape)) return;

        string hPoint = data.Point;
        string triangle = data.Shape;

        if (!context.Points.ContainsKey(hPoint))
        {
            var points = context.GetPointsFromPlane(triangle);

            if (points.Count >= 3)
            {
                context.Points[hPoint] = Point3D.GetOrthocenter(points[0], points[1], points[2]);
                Console.WriteLine($"[HANDLER] Đã dựng trực tâm {hPoint} của tam giác {triangle}");
            }
        }
    }
}
