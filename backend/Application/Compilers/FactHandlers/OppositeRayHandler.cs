using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using System;

namespace Application.Compilers.FactHandlers;

public class OppositeRayHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Opposite_ray;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<OppositeRayData>();
        if (data == null) return;
        
        string pt = data.Point;
        string origin = data.Origin;
        string rayPt = data.RayPoint;

        // Skip if the point was already created by another handler (e.g. Length, Ratio)
        if (context.Points.ContainsKey(pt)) return;

        // Ensure the ray origin and a point on the ray already exist
        if (!context.Points.ContainsKey(origin) || !context.Points.ContainsKey(rayPt)) return;

        var pOrigin = context.Points[origin];
        var pRay = context.Points[rayPt];

        // Original ray: vector = pRay - pOrigin
        // Opposite ray: opposite vector = pOrigin - pRay (i.e. -(pRay - pOrigin))
        var oppositeVector = new Point3D(
            pOrigin.X - pRay.X,
            pOrigin.Y - pRay.Y,
            pOrigin.Z - pRay.Z
        );

        // By default (per user suggestion), if no explicit length is given, set AM = AB (A = origin, B = rayPt, M = new point)
        // Then A is the midpoint of BM
        context.Points[pt] = new Point3D(
            pOrigin.X + oppositeVector.X,
            pOrigin.Y + oppositeVector.Y,
            pOrigin.Z + oppositeVector.Z
        );

        Console.WriteLine($"[HANDLER] OppositeRay: Đã dựng '{pt}' trên tia đối của '{origin}{rayPt}'. Tọa độ sinh ra: {context.Points[pt]}");
    }
}
