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

        if (!context.Points.ContainsKey(oPoint))
        {
            var points = context.GetPointsFromPlane(triangle);

            if (points.Count >= 3)
            {
                var center = Point3D.GetCircumcenter(points.ToArray());
                context.Points[oPoint] = center;
                double radius = center.DistanceToPoint(points[0]);

                if (points.Count == 3)
                {
                    var plane = new Plane3D(points[0], points[1], points[2]);
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
}
