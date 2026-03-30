using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class BelongsToHandler : IFactHandler
{
    public FactType TargetFactType => FactType.belongs_to;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<BelongsToData>();
        if (data == null || string.IsNullOrEmpty(data.Point) || string.IsNullOrEmpty(data.Target)) return;

        string m = data.Point;
        string lineOrPlane = data.Target;

        if (!context.Points.ContainsKey(m))
        {
            // Case A: M thuộc AB (Đường thẳng)
            if (lineOrPlane.Length == 2)
            {
                var p1 = context.GetPoint(lineOrPlane[0].ToString());
                var p2 = context.GetPoint(lineOrPlane[1].ToString());

                if (p1 != null && p2 != null)
                {
                    // Mặc định đặt tại 1/3 đoạn thẳng nếu không có thêm thông tin tỉ lệ
                    context.Points[m] = p1.GetPointAtRatio(p2, 0.33);
                    Console.WriteLine($"[HANDLER] Đã đặt điểm {m} mặc định tại 1/3 {lineOrPlane}");
                }
            }
            // Case B: M thuộc (ABC) (Mặt phẳng)
            else if (lineOrPlane.Length >= 3)
            {
                var points = context.GetPointsFromPlane(lineOrPlane);
                if (points.Count >= 3)
                {
                    // Mặc định đặt tại trọng tâm của mặt phẳng
                    context.Points[m] = Point3D.GetCentroid(points.ToArray());
                    Console.WriteLine($"[HANDLER] Đã đặt điểm {m} mặc định tại trọng tâm của {lineOrPlane}");
                }
            }
        }
    }
}
