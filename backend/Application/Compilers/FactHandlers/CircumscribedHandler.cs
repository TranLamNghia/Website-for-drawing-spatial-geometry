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

        // Nếu fact đang nói về một khối 3D (vd ABCD/S.ABCD) nhưng compiler mới dựng
        // được 3 điểm đáy, đừng tạo nhầm O thành tâm đường tròn đáy. Đợi đủ đỉnh rồi
        // mới dựng mặt cầu ngoại tiếp.
        bool isSolidCircumsphere = solidChars.Length >= 4;
        if (isSolidCircumsphere && points.Count < solidChars.Length) return;

        var center = Point3D.GetCircumcenter(points.ToArray());
        if (center == null) return;

        if (context.Points.ContainsKey(spherePoint))
        {
            context.Points[spherePoint] = center;
        }
        else
        {
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

        // Luôn đăng ký hoặc cập nhật sphere/circle dù điểm đã tồn tại từ trước
        // (vd: được nạp từ SymPy hoặc từng được dựng tạm ở pass trước).
        var centerPt = context.Points[spherePoint];
        double radius = centerPt.DistanceToPoint(points[0]);

        if (points.Count == 3)
        {
            var existingCircle = context.Circles.FirstOrDefault(c => c.Center == spherePoint);
            var plane = new Plane3D(points[0], points[1], points[2]);
            if (existingCircle != null)
            {
                existingCircle.Radius = radius;
                existingCircle.Normal = new double[] { plane.A, plane.B, plane.C };
            }
            else
            {
                context.Circles.Add(new CircleData
                {
                    Center = spherePoint,
                    Radius = radius,
                    Normal = new double[] { plane.A, plane.B, plane.C }
                });
            }
        }
        else
        {
            context.Circles.RemoveAll(c => c.Center == spherePoint);
            var existingSphere = context.Spheres.FirstOrDefault(s => s.Center == spherePoint);
            if (existingSphere != null)
            {
                existingSphere.Radius = radius;
            }
            else
            {
                context.Spheres.Add(new SphereData { Center = spherePoint, Radius = radius });
            }
        }
        Console.WriteLine($"[HANDLER] Đã dựng tâm ngoại tiếp {spherePoint} của {solid} (R={radius:F2})");
    }
}
