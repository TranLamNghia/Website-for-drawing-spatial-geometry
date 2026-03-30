using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class PerpendicularHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Perpendicular;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ObjectsData>(); 
        if (data == null || data.Objects == null || data.Objects.Count < 2) return;

        // VD: "SA vuông góc đáy (ABC)". 
        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        Console.WriteLine($"[HANDLER] Ghi nhận tính chất vuông góc: {obj1} ⊥ {obj2}");
        // Thường dùng để gán tọa độ hình chiếu hoặc chiều cao, Stage 2 của GeometryCompiler đã xử lý.
    }
}
