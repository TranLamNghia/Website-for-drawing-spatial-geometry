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
                var centroid = Point3D.GetCentroid(points.ToArray());
                
                // Kiểm tra xem tại tọa độ này đã có điểm nào tồn tại chưa
                string existingPoint = context.Points.FirstOrDefault(kvp => kvp.Value.DistanceToPoint(centroid) < 1e-4).Key;

                if (!string.IsNullOrEmpty(existingPoint))
                {
                    Console.WriteLine($"[HANDLER] Trọng tâm {g} trùng với điểm {existingPoint} đã có. Tái sử dụng...");
                    context.ReplacePointReference(g, existingPoint);
                }
                else
                {
                    context.Points[g] = centroid;
                    Console.WriteLine($"[HANDLER] Đã dựng trọng tâm {g} của {polygon}");
                }
            }
        }
    }
}
