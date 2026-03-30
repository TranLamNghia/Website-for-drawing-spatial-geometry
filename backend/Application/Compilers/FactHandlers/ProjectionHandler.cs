using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class ProjectionHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Projection;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ProjectionData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.From)) return;

        string target = data.Point;
        string from = data.From;
        string onto = data.Onto;

        if (!context.Points.ContainsKey(target))
        {
            var pFrom = context.GetPoint(from);
            if (pFrom == null) return;

            Point3D? result = null;

            if (onto.Length == 2) // Chiếu lên đường thẳng
            {
                var line = context.GetLine(onto);
                if (line != null) result = line.GetProjection(pFrom);
            }
            else if (onto.Length >= 3) // Chiếu lên mặt phẳng
            {
                var plane = context.GetPlane(onto);
                if (plane != null) result = plane.GetProjection(pFrom);
            }

            if (result != null)
            {
                context.Points[target] = result;
                Console.WriteLine($"[HANDLER] Đã dựng hình chiếu {target} từ {from} lên {onto}");
            }
        }
    }
}
