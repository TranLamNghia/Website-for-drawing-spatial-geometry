using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class AngleHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Angle;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<AngleData>(); 
        if (data == null || data.Objects == null || data.Objects.Count < 2) return;

        double val = 0;
        if (double.TryParse(data.Value, out double ang)) val = ang;

        Console.WriteLine($"[HANDLER] Ghi nhận góc {data.AngleType}: {string.Join(", ", data.Objects)} = {val}°");
        // Một số bài toán (VD "SBA = 60°") được dùng để tính chiều cao.
    }
}
