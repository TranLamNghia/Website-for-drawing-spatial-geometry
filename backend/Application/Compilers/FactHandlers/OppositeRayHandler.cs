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

        // Nếu điểm đã được sinh ra bởi một handler khác (như Length, Ratio), bỏ qua
        if (context.Points.ContainsKey(pt)) return;

        // Cần đảm bảo Gốc tia và Điểm trên tia đã tồn tại
        if (!context.Points.ContainsKey(origin) || !context.Points.ContainsKey(rayPt)) return;

        var pOrigin = context.Points[origin];
        var pRay = context.Points[rayPt];

        // Tia gốc: Vecto = pRay - pOrigin
        // Tia đối: Vecto đối = pOrigin - pRay (hay - (pRay - pOrigin))
        var oppositeVector = new Point3D(
            pOrigin.X - pRay.X,
            pOrigin.Y - pRay.Y,
            pOrigin.Z - pRay.Z
        );

        // Mặc định (như gợi ý của user), nếu không có độ dài cụ thể, ta gán AM = AB (với A là gốc, B là rayPt, M là pt mới)
        // Khi đó A là trung điểm của BM
        context.Points[pt] = new Point3D(
            pOrigin.X + oppositeVector.X,
            pOrigin.Y + oppositeVector.Y,
            pOrigin.Z + oppositeVector.Z
        );

        Console.WriteLine($"[HANDLER] OppositeRay: Đã dựng '{pt}' trên tia đối của '{origin}{rayPt}'. Tọa độ sinh ra: {context.Points[pt]}");
    }
}
