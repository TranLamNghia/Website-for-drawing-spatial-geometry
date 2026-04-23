using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using System;

namespace Application.Compilers.FactHandlers;

public class PerpendicularRayHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Perpendicular_ray;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<PerpendicularRayData>();
        if (data == null || string.IsNullOrEmpty(data.Origin)) return;
        
        string pt = data.Point;
        string origin = data.Origin;
        string perfTo = data.PerpendicularTo;

        if (context.Points.ContainsKey(pt)) return;
        if (!context.Points.ContainsKey(origin)) return;

        var pOrigin = context.Points[origin];
        Vector3D translationVector = new Vector3D(0, 0, context.UnitLength);

        if (perfTo.Length >= 3)
        {
            var plane = context.GetPlane(perfTo);
            if (plane != null)
            {
                var normal = plane.Normal;
                double len = normal.Magnitude();
                if (len > 0)
                {
                    translationVector = new Vector3D(
                        (normal.X / len) * context.UnitLength,
                        (normal.Y / len) * context.UnitLength,
                        (normal.Z / len) * context.UnitLength
                    );
                }
            }
        }
        else if (perfTo.Length == 2)
        {
            // Vuông góc với đường thẳng - mặc định lấy 1 vector vuông góc trong mặt phẳng (Oxy) hoặc (Oyz)
            var line = context.GetLine(perfTo);
            if (line != null)
            {
                double dx = line.Direction.X;
                double dy = line.Direction.Y;
                double dz = line.Direction.Z;
                
                // Construct a perpendicular vector (-dy, dx, 0) if it's not a zero vector
                double nX = -dy; double nY = dx; double nZ = 0;
                if (Math.Abs(nX) < 1e-6 && Math.Abs(nY) < 1e-6)
                {
                    nX = 0; nY = -dz; nZ = dy;
                }
                
                double len = Math.Sqrt(nX*nX + nY*nY + nZ*nZ);
                if (len > 0)
                {
                    translationVector = new Vector3D(
                        (nX / len) * context.UnitLength,
                        (nY / len) * context.UnitLength,
                        (nZ / len) * context.UnitLength
                    );
                }
            }
        }

        context.Points[pt] = new Point3D(
            pOrigin.X + translationVector.X,
            pOrigin.Y + translationVector.Y,
            pOrigin.Z + translationVector.Z
        );

        Console.WriteLine($"[HANDLER] PerpendicularRay: Đã dựng '{pt}' trên tia gốc {origin} vuông góc với {perfTo}. Tọa độ: {context.Points[pt]}");
    }
}
