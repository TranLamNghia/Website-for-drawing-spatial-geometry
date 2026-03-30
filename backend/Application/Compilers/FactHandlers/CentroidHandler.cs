using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class CentroidHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Centroid;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ObjectsData>(); 
        if (data == null || string.IsNullOrEmpty(data.Point) || data.Objects == null || data.Objects.Count == 0) return;

        string g = data.Point;
        string polygon = data.Objects[0]; // Thường là "ABC", "ABCD"

        if (!context.Points.ContainsKey(g))
        {
            var points = context.GetPointsFromPlane(polygon);

            if (points.Count >= 3)
            {
                context.Points[g] = Point3D.GetCentroid(points.ToArray());
                Console.WriteLine($"[HANDLER] Đã dựng trọng tâm {g} của {polygon}");
            }
        }
    }
}
