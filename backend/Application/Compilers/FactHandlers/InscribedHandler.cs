using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class InscribedHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Inscribed;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<InscribedData>();
        if (data == null || string.IsNullOrEmpty(data.Inner)) return;

        string inPoint = data.Inner;
        string outer = data.Outer;

        var points = context.GetPointsFromPlane(outer);

        if (!context.Points.ContainsKey(inPoint) && !string.IsNullOrEmpty(outer))
        {
            // Case A: Inner sphere of a triangle (Incenter)
            if (outer.Length == 3)
            {
                if (points.Count >= 3)
                {
                    context.Points[inPoint] = Point3D.GetIncenter(points[0], points[1], points[2]);
                    Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} của tam giác {outer}");
                }
            }
            // Case B: Inner sphere of specialized solids (Cubes, Tetrahedrons) 
            // Case B1: Khối Tứ diện (Dùng công thức Barycentric đã viết)
            else if (outer.Length == 4 && points.Count >= 4)
            {
                context.Points[inPoint] = Point3D.GetTetrahedronIncenter(points[0], points[1], points[2], points[3]);
                Console.WriteLine($"[HANDLER] Đã dựng tâm mặt cầu nội tiếp {inPoint} của tứ diện {outer}");
            }
            // Case B2: Khối Hộp / Lập phương (Đối xứng tâm hoàn toàn -> Dùng Centroid là CHUẨN)
            else if (outer.Length == 8 && points.Count == 8) 
            {
                context.Points[inPoint] = Point3D.GetCentroid(points.ToArray());
                Console.WriteLine($"[HANDLER] Đã dựng tâm nội tiếp {inPoint} (trùng trọng tâm) của khối hộp {outer}");
            }
            // Case B3: Khối chóp đều (VD: S.ABCD có 5 đỉnh, S.ABC có 4 đỉnh)
            else if (outer.Length >= 4 && points.Count == outer.Length)
            {
                // Điểm đầu tiên thường là đỉnh chóp (VD: chữ S trong SABCD)
                var apex = points[0]; 
                // Cắt lấy mảng các điểm dưới đáy (VD: A, B, C, D)
                var basePoints = points.Skip(1).ToArray(); 

                // Nếu là khối chóp
                if (basePoints.Length >= 3)
                {
                    context.Points[inPoint] = Point3D.GetRegularPyramidIncenter(apex, basePoints);
                    Console.WriteLine($"[HANDLER] Đã dựng tâm mặt cầu nội tiếp {inPoint} của chóp đều {outer}");
                }
            }
        }
    }
}
