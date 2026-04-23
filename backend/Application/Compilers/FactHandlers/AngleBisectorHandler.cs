using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using System;

namespace Application.Compilers.FactHandlers;

public class AngleBisectorHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Angle_bisector;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<AngleBisectorData>();
        if (data == null) return;
        
        string pt = data.Point;
        string vertex = data.Vertex;
        string r1 = data.Ray1;
        string r2 = data.Ray2;

        if (context.Points.ContainsKey(pt)) return;
        if (!context.Points.ContainsKey(vertex) || !context.Points.ContainsKey(r1) || !context.Points.ContainsKey(r2)) return;

        var pV = context.Points[vertex];
        var p1 = context.Points[r1];
        var p2 = context.Points[r2];

        double dx1 = p1.X - pV.X; double dy1 = p1.Y - pV.Y; double dz1 = p1.Z - pV.Z;
        double len1 = Math.Sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);
        
        double dx2 = p2.X - pV.X; double dy2 = p2.Y - pV.Y; double dz2 = p2.Z - pV.Z;
        double len2 = Math.Sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);

        if (len1 < 1e-6 || len2 < 1e-6) return;

        dx1 /= len1; dy1 /= len1; dz1 /= len1;
        dx2 /= len2; dy2 /= len2; dz2 /= len2;

        double bx = dx1 + dx2;
        double by = dy1 + dy2;
        double bz = dz1 + dz2;

        double blen = Math.Sqrt(bx*bx + by*by + bz*bz);
        if (blen > 1e-6)
        {
            bx /= blen; by /= blen; bz /= blen;
            bx *= context.UnitLength;
            by *= context.UnitLength;
            bz *= context.UnitLength;
        }
        else
        {
            bx = 0; by = context.UnitLength; bz = 0;
        }

        context.Points[pt] = new Point3D(pV.X + bx, pV.Y + by, pV.Z + bz);

        Console.WriteLine($"[HANDLER] AngleBisector: Đã dựng '{pt}' trên tia phân giác góc {r1}{vertex}{r2}. Tọa độ: {context.Points[pt]}");
    }
}
