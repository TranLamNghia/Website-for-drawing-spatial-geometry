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

        if (string.IsNullOrEmpty(outer)) return;
        string solidChars = new string(outer.Where(char.IsUpper).ToArray());
        var points = context.GetPointsFromPlane(solidChars);
        if (points.Count < 3) return;

        // Tính tâm nội tiếp nếu điểm chưa tồn tại
        double registeredRadius = -1;
        bool isTriangle = solidChars.Length == 3;

        if (!context.Points.ContainsKey(inPoint))
        {
            // Case A: Tam giác (Incenter)
            if (isTriangle)
            {
                var result = Point3D.GetIncenter(points.ToArray());
                context.Points[inPoint] = result.Center;
                registeredRadius = result.Radius;
                Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} của đa giác {outer} (R={result.Radius:F2})");
            }
            // Case B1: Khối Hộp / Lập phương
            else if (solidChars.Length == 8 && points.Count == 8)
            {
                var center = Point3D.GetCentroid(points.ToArray());
                context.Points[inPoint] = center;
                var baseCentroid = Point3D.GetCentroid(points.Take(4).ToArray());
                registeredRadius = center.DistanceToPoint(baseCentroid);
                Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} của khối hộp {outer} (R={registeredRadius:F2})");
            }
            // Case B2: Khối chóp hoặc Tứ diện
            else if (solidChars.Length >= 4 && points.Count == solidChars.Length)
            {
                var apex = points[0];
                var basePoints = points.Skip(1).ToArray();

                if (basePoints.Length >= 3)
                {
                    var faces = new System.Collections.Generic.List<Plane3D>();
                    faces.Add(new Plane3D(basePoints[0], basePoints[1], basePoints[2]));
                    for (int i = 0; i < basePoints.Length; i++)
                    {
                        var p1 = basePoints[i];
                        var p2 = basePoints[(i + 1) % basePoints.Length];
                        faces.Add(new Plane3D(apex, p1, p2));
                    }
                    var baseCentroid = Point3D.GetCentroid(basePoints);
                    var interiorPoint = apex.GetMidpoint(baseCentroid);
                    var result = Point3D.GetInsphere(faces, interiorPoint);
                    context.Points[inPoint] = result.Center;
                    registeredRadius = result.Radius;
                    Console.WriteLine($"[HANDLER] Đã dựng tâm mặt cầu nội tiếp {inPoint} của khối {outer} (R={result.Radius:F2})");
                }
            }
        }

        // Luôn đăng ký sphere/circle dù điểm đã tồn tại từ trước (vd: được nạp từ SymPy)
        if (!context.Points.ContainsKey(inPoint)) return;

        if (isTriangle)
        {
            if (!context.Circles.Any(c => c.Center == inPoint))
            {
                double r = registeredRadius >= 0 ? registeredRadius : context.Points[inPoint].DistanceToPoint(points[0]);
                var plane = new Plane3D(points[0], points[1], points[2]);
                context.Circles.Add(new CircleData {
                    Center = inPoint,
                    Radius = r,
                    Normal = new double[] { plane.A, plane.B, plane.C }
                });
            }
        }
        else
        {
            if (!context.Spheres.Any(s => s.Center == inPoint))
            {
                double r = registeredRadius >= 0 ? registeredRadius : context.Points[inPoint].DistanceToPoint(points[0]);
                context.Spheres.Add(new SphereData { Center = inPoint, Radius = r });
            }
        }
    }
}
