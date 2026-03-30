using System;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class LengthHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Length;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<LengthData>();
        if (data == null || string.IsNullOrEmpty(data.Target) || string.IsNullOrEmpty(data.Value)) return;

        string edge = data.Target; // VD: "AB"
        if (edge.Length < 2) return;

        double d = 0;
        if (double.TryParse(data.Value, out double val)) d = val;

        // VD: Nếu đã có A mà chưa có B, và biết hướng AB là 1 tia nhất định (Phức tạp hơn Stage 1&2...)
        Console.WriteLine($"[HANDLER] Ghi nhận độ dài: {edge} = {d}");
        // Các Case "M trên AB sao cho AM = 3" được tách thành BelongsTo + Length.
    }
}