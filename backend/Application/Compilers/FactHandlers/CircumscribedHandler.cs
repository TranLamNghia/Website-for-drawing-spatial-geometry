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

        string spherePoint = data.Outer; // Giả sử AI bóc tách tâm là Outer (hoặc 1 điểm mới)
        string solid = data.Inner;

        if (!context.Points.ContainsKey(spherePoint))
        {
            string solidChars = new string(solid.Where(char.IsUpper).ToArray());
            var points = context.GetPointsFromPlane(solidChars);

            if (points.Count >= 3)
            {
                var center = Point3D.GetCircumcenter(points.ToArray());
                context.Points[spherePoint] = center;
                double radius = center.DistanceToPoint(points[0]);

                if (points.Count == 3)
                {
                    var plane = new Plane3D(points[0], points[1], points[2]);
                    context.Circles.Add(new CircleData { 
                        Center = spherePoint, 
                        Radius = radius, 
                        Normal = new double[] { plane.A, plane.B, plane.C } 
                    });
                }
                else
                {
                    context.Spheres.Add(new SphereData { Center = spherePoint, Radius = radius });
                }
                Console.WriteLine($"[HANDLER] Đã dựng tâm ngoại tiếp {spherePoint} của {solid} (R={radius:F2})");
            }
        }
    }
}
