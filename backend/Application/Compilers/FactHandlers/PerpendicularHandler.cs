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

        // BD ⊥ AC: D là chân đường cao từ B xuống AC (đề tam giác vuông tại B).
        if (obj1.Length == 2 && obj2.Length == 2)
        {
            string from = obj1[0].ToString();
            string to = obj1[1].ToString();
            if (!context.Points.ContainsKey(to))
            {
                var fromPt = context.GetPoint(from);
                var line = context.GetLine(obj2);
                if (fromPt != null && line != null)
                {
                    context.Points[to] = line.GetProjection(fromPt);
                    Console.WriteLine($"[HANDLER] Dựng chân vuông góc {to} trên {obj2} từ {from}: {context.Points[to]}");
                }
            }
        }
    }
}
