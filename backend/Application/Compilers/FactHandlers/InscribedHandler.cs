using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class InscribedHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Inscribed;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<InscribedData>();
        if (data == null || string.IsNullOrEmpty(data.Inner)) return;

        string inPoint = data.Inner;
        string outer = data.Outer;

        string solidChars = new string(outer.Where(char.IsUpper).ToArray());
        var points = context.GetPointsFromPlane(solidChars);

        if (!context.Points.ContainsKey(inPoint) && !string.IsNullOrEmpty(outer))
        {
            // Case A: Inner sphere of a triangle (Incenter)
            if (solidChars.Length == 3)
            {
                if (points.Count >= 3)
                {
                    var result = Point3D.GetIncenter(points.ToArray());
                    context.Points[inPoint] = result.Center;
                    var plane = new Plane3D(points[0], points[1], points[2]);
                    context.Circles.Add(new CircleData { 
                        Center = inPoint, 
                        Radius = result.Radius,
                        Normal = new double[] { plane.A, plane.B, plane.C }
                    });
                    Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} của đa giác {outer} (R={result.Radius:F2})");
                }
            }
            // Case B: Inner sphere of specialized solids (Cubes, Pyramids, Tetrahedrons) 
            // Case B1: Khối Hộp / Lập phương (Đối xứng tâm hoàn toàn -> Dùng Centroid)
            else if (solidChars.Length == 8 && points.Count == 8) 
            {
                var center = Point3D.GetCentroid(points.ToArray());
                context.Points[inPoint] = center;
                var baseCentroid = Point3D.GetCentroid(points.Take(4).ToArray());
                double r = center.DistanceToPoint(baseCentroid);
                context.Spheres.Add(new SphereData { Center = inPoint, Radius = r });
                Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} của khối hộp {outer} (R={r:F2})");
            }
            // Case B2: Khối chóp hoặc Tứ điện (S.ABCD có 5 đỉnh, S.ABC có 4 đỉnh)
            else if (solidChars.Length >= 4 && points.Count == solidChars.Length)
            {
                var apex = points[0]; 
                var basePoints = points.Skip(1).ToArray(); 

                if (basePoints.Length >= 3)
                {
                    // Tự động dựng danh sách các mặt phẳng của khối chóp biên
                    var faces = new System.Collections.Generic.List<Plane3D>();
                    
                    // 1. Thêm mặt đáy
                    faces.Add(new Plane3D(basePoints[0], basePoints[1], basePoints[2]));

                    // 2. Thêm các mặt bên
                    for (int i = 0; i < basePoints.Length; i++)
                    {
                        var p1 = basePoints[i];
                        var p2 = basePoints[(i + 1) % basePoints.Length];
                        faces.Add(new Plane3D(apex, p1, p2));
                    }

                    // Điểm mốc bên trong khối đa diện (Trung điểm của đoạn nối đỉnh xuống trọng tâm đáy)
                    var baseCentroid = Point3D.GetCentroid(basePoints);
                    var interiorPoint = apex.GetMidpoint(baseCentroid);

                    var result = Point3D.GetInsphere(faces, interiorPoint);
                    context.Points[inPoint] = result.Center;
                    context.Spheres.Add(new SphereData { Center = inPoint, Radius = result.Radius });
                    Console.WriteLine($"[HANDLER] Đã dựng tâm mặt cầu nội tiếp {inPoint} của khối {outer} (R={result.Radius:F2})");
                }
            }
        }
    }
}
