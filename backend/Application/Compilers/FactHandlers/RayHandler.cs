using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using System;

namespace Application.Compilers.FactHandlers;

public class RayHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Ray;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<RayData>();
        if (data == null) return;
        
        string pt = data.Point;
        string origin = data.Origin;
        string rayPt = data.RayPoint;

        if (context.Points.ContainsKey(pt)) return;
        if (!context.Points.ContainsKey(origin) || !context.Points.ContainsKey(rayPt)) return;

        var pOrigin = context.Points[origin];
        var pRay = context.Points[rayPt];

        var rayVector = new Point3D(
            pRay.X - pOrigin.X,
            pRay.Y - pOrigin.Y,
            pRay.Z - pOrigin.Z
        );

        context.Points[pt] = new Point3D(
            pOrigin.X + rayVector.X * 1.5,
            pOrigin.Y + rayVector.Y * 1.5,
            pOrigin.Z + rayVector.Z * 1.5
        );

        Console.WriteLine($"[HANDLER] Ray: Đã dựng '{pt}' trên tia '{origin}{rayPt}'. Tọa độ: {context.Points[pt]}");
    }
}
