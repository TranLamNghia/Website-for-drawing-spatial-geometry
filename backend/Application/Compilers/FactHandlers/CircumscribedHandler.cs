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

        string spherePoint = data.Outer;
        string solid = data.Inner;
        string solidChars = new string(solid.Where(char.IsUpper).ToArray());
        var points = context.GetPointsFromPlane(solidChars);
        if (points.Count < 3) return;

        // Tính tâm ngoại tiếp nếu điểm chưa tồn tại
        if (!context.Points.ContainsKey(spherePoint))
        {
            var center = Point3D.GetCircumcenter(points.ToArray());
            if (center == null) return;

            string existingPoint = context.Points.FirstOrDefault(kvp => kvp.Value.DistanceToPoint(center) < 1e-4).Key;
            if (!string.IsNullOrEmpty(existingPoint))
            {
                Console.WriteLine($"[HANDLER] Tâm ngoại tiếp {spherePoint} trùng với điểm {existingPoint}. Tái sử dụng...");
                context.ReplacePointReference(spherePoint, existingPoint);
                spherePoint = existingPoint;
            }
            else
            {
                context.Points[spherePoint] = center;
            }
        }

        // Luôn đăng ký sphere/circle dù điểm đã tồn tại từ trước (vd: được nạp từ SymPy)
        var centerPt = context.Points[spherePoint];
        double radius = centerPt.DistanceToPoint(points[0]);

        if (points.Count == 3)
        {
            if (!context.Circles.Any(c => c.Center == spherePoint))
            {
                var plane = new Plane3D(points[0], points[1], points[2]);
                context.Circles.Add(new CircleData {
                    Center = spherePoint,
                    Radius = radius,
                    Normal = new double[] { plane.A, plane.B, plane.C }
                });
            }
        }
        else
        {
            if (!context.Spheres.Any(s => s.Center == spherePoint))
            {
                context.Spheres.Add(new SphereData { Center = spherePoint, Radius = radius });
            }
        }
        Console.WriteLine($"[HANDLER] Đã dựng tâm ngoại tiếp {spherePoint} của {solid} (R={radius:F2})");
    }
}
