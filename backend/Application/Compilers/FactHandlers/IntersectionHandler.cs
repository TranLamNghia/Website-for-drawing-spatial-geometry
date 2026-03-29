using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class IntersectionHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Intersection;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<IntersectionData>();
        if (data == null || data.Objects == null || data.Objects.Count < 2) return;

        string target = data.Result?.Value ?? "";
        if (string.IsNullOrEmpty(target)) return;

        if (context.Points.ContainsKey(target)) return;

        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        Point3D? intersectPoint = null;

        // Case A: Line - Line
        if (obj1.Length == 2 && obj2.Length == 2)
        {
            var l1 = context.GetLine(obj1);
            var l2 = context.GetLine(obj2);
            if (l1 != null && l2 != null) intersectPoint = l1.IntersectWith(l2);
        }
        // Case B: Line - Plane
        else if (obj1.Length == 2 && obj2.Length >= 3)
        {
            var line = context.GetLine(obj1);
            var plane = context.GetPlane(obj2);
            if (line != null && plane != null) intersectPoint = plane.IntersectWith(line);
        }
        // Case C: Plane - Line
        else if (obj1.Length >= 3 && obj2.Length == 2)
        {
            var plane = context.GetPlane(obj1);
            var line = context.GetLine(obj2);
            if (plane != null && line != null) intersectPoint = plane.IntersectWith(line);
        }

        if (intersectPoint != null)
        {
            context.Points[target] = intersectPoint;
            Console.WriteLine($"[HANDLER] Đã dựng giao điểm {target} giữa {obj1} và {obj2}");
        }
    }
}
