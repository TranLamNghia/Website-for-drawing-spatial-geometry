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
        if (data.Shape == ShapeType.Circle)
        {
            string centerName = string.IsNullOrEmpty(data.Center) ? "O" : data.Center;
            var centerPoint = context.GetPoint(centerName);
            if (centerPoint == null)
            {
                centerPoint = new Point3D(0, 0, 0);
                context.Points[centerName] = centerPoint;
                Console.WriteLine($"[HANDLER] Tự động khởi tạo tâm {centerName} tại (0,0,0)");
            }

            double r = context.UnitLength;
            if (!string.IsNullOrEmpty(data.Radius))
            {
                if (double.TryParse(data.Radius, out double val)) r = val;
            }

            context.Circles.Add(new CircleData
            {
                Center = centerName,
                Radius = r,
                Normal = new double[] { 0, 0, 1 } // Default to XY plane if not specified
            });
            Console.WriteLine($"[HANDLER] Đã thêm đường tròn tâm {centerName}, bán kính {r}");
        }
        // Handle Explicit Sphere
        else if (data.Shape == ShapeType.Sphere)
        {
            string centerName = string.IsNullOrEmpty(data.Center) ? "O" : data.Center;
            var centerPoint = context.GetPoint(centerName);
            if (centerPoint == null)
            {
                centerPoint = new Point3D(0, 0, 0);
                context.Points[centerName] = centerPoint;
                Console.WriteLine($"[HANDLER] Tự động khởi tạo tâm {centerName} tại (0,0,0)");
            }

            double r = context.UnitLength;
            if (!string.IsNullOrEmpty(data.Radius))
            {
                if (double.TryParse(data.Radius, out double val)) r = val;
            }

            context.Spheres.Add(new SphereData
            {
                Center = centerName,
                Radius = r
            });
            Console.WriteLine($"[HANDLER] Đã thêm mặt cầu tâm {centerName}, bán kính {r}");
        }
        // Handle Cone
        else if (data.Shape == ShapeType.Cone || data.Shape == ShapeType.Regular_cone)
        {
            string centerName = string.IsNullOrEmpty(data.Center) ? "O" : data.Center;
            string apexName = string.IsNullOrEmpty(data.Apex) ? "S" : data.Apex;

            if (context.GetPoint(centerName) == null)
            {
                context.Points[centerName] = new Point3D(0, 0, 0);
                Console.WriteLine($"[HANDLER] Tự động khởi tạo tâm đáy nón {centerName} tại (0,0,0)");
            }

            double r = context.UnitLength;
            if (!string.IsNullOrEmpty(data.Radius))
            {
                if (double.TryParse(data.Radius, out double val)) r = val;
            }

            // Đường tròn đáy
            context.Circles.Add(new CircleData { Center = centerName, Radius = r, Normal = new double[] { 0, 0, 1 } });

            // Hình nón
            context.Cones.Add(new ConeData { Center = centerName, Apex = apexName, Radius = r });
            Console.WriteLine($"[HANDLER] Đã thêm hình nón tâm đáy {centerName}, đỉnh {apexName}, bán kính {r}");
        }
        // Handle Cylinder
        else if (data.Shape == ShapeType.Cylinder || data.Shape == ShapeType.Regular_cylinder)
        {
            string centerBottomName = string.IsNullOrEmpty(data.Center) ? "O" : data.Center;
            // Tâm đáy trên thường là O' hoặc tên theo convention
            string centerTopName = centerBottomName + "'";

            if (context.GetPoint(centerBottomName) == null)
            {
                context.Points[centerBottomName] = new Point3D(0, 0, 0);
                Console.WriteLine($"[HANDLER] Tự động khởi tạo tâm đáy dưới {centerBottomName} tại (0,0,0)");
            }

            double r = context.UnitLength;
            if (!string.IsNullOrEmpty(data.Radius))
            {
                if (double.TryParse(data.Radius, out double val)) r = val;
            }

            // Hai đường tròn đáy
            context.Circles.Add(new CircleData { Center = centerBottomName, Radius = r, Normal = new double[] { 0, 0, 1 } });
            context.Circles.Add(new CircleData { Center = centerTopName, Radius = r, Normal = new double[] { 0, 0, 1 } });

            // Hình trụ
            context.Cylinders.Add(new CylinderData { CenterBottom = centerBottomName, CenterTop = centerTopName, Radius = r });
            Console.WriteLine($"[HANDLER] Đã thêm hình trụ đáy dưới {centerBottomName}, đáy trên {centerTopName}, bán kính {r}");
        }
    }
}
