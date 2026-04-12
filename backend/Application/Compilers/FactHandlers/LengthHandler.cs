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

        // Log the raw value (e.g., "a" or "5")
        Console.WriteLine($"[HANDLER] Ghi nhận độ dài: {edge} = {data.Value}");
        // Các Case "M trên AB sao cho AM = 3" được tách thành BelongsTo + Length.
    }
}