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

        var points = context.GetPointsFromPlane(triangle);
        if (points.Count >= 3)
        {
            var center = Point3D.GetCircumcenter(points.ToArray());
            if (center == null) return;

            // Kiểm tra xem tại tọa độ này đã có điểm nào tồn tại chưa (VD: Điểm G đã có)
            string existingPoint = context.Points.FirstOrDefault(kvp => kvp.Value.DistanceToPoint(center) < 1e-4).Key;

            if (!string.IsNullOrEmpty(existingPoint))
            {
                // Nếu đã có điểm tại vị trí này (VD: G), dùng luôn tên đó thay vì tạo O
                Console.WriteLine($"[HANDLER] Tâm ngoại tiếp {oPoint} trùng với điểm {existingPoint} đã có. Tái sử dụng...");
                context.ReplacePointReference(oPoint, existingPoint); // Đăng ký Alias để cleanup
                oPoint = existingPoint; 
            }
            else if (!context.Points.ContainsKey(oPoint))
            {
                // Nếu chưa có và tên oPoint mới, mới tạo
                context.Points[oPoint] = center;
            }

            double radius = center.DistanceToPoint(points[0]);

            if (points.Count == 3)
            {
                var plane = new Plane3D(points[0], points[1], points[2]);
                // Luôn đảm bảo có CircleData trong context để FE vẽ
                context.Circles.Add(new CircleData { 
                    Center = oPoint, 
                    Radius = radius, 
                    Normal = new double[] { plane.A, plane.B, plane.C } 
                });
            }
            else
            {
                context.Spheres.Add(new SphereData { Center = oPoint, Radius = radius });
            }
            Console.WriteLine($"[HANDLER] Đã dựng tâm {oPoint} của {data.Shape} (R={radius:F2})");
        }
    }
}
