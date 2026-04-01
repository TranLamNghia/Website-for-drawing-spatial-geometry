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
                context.Points[oPoint] = Point3D.GetCircumcenter(points.ToArray());
                Console.WriteLine($"[HANDLER] Đã dựng tâm {oPoint} của {data.Shape} (Shape-agnostic)");
            }
        }
    }
}
