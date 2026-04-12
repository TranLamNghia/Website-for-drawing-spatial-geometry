using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class ShapeHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Shape;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ShapeData>();
        if (data == null) return;

        // Handle Explicit Circle
        if (data.Shape == ShapeType.Circle && !string.IsNullOrEmpty(data.Center))
        {
            var centerPoint = context.GetPoint(data.Center);
            if (centerPoint != null)
            {
                double r = context.UnitLength;
                if (!string.IsNullOrEmpty(data.Radius))
                {
                    // Basic attempt to parse or evaluate radius
                    if (double.TryParse(data.Radius, out double val)) r = val;
                }

                context.Circles.Add(new CircleData
                {
                    Center = data.Center,
                    Radius = r,
                    Normal = new double[] { 0, 0, 1 } // Default to XY plane if not specified
                });
                Console.WriteLine($"[HANDLER] Đã thêm đường tròn tâm {data.Center}, bán kính {r}");
            }
        }
        // Handle Explicit Sphere
        else if (data.Shape == ShapeType.Sphere && !string.IsNullOrEmpty(data.Center))
        {
            var centerPoint = context.GetPoint(data.Center);
            if (centerPoint != null)
            {
                double r = context.UnitLength;
                if (!string.IsNullOrEmpty(data.Radius))
                {
                    if (double.TryParse(data.Radius, out double val)) r = val;
                }

                context.Spheres.Add(new SphereData
                {
                    Center = data.Center,
                    Radius = r
                });
                Console.WriteLine($"[HANDLER] Đã thêm mặt cầu tâm {data.Center}, bán kính {r}");
            }
        }
    }
}
