using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class AreaHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Area;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<LengthData>();
        if (data == null || string.IsNullOrEmpty(data.Target) || string.IsNullOrEmpty(data.Value)) return;

        Console.WriteLine($"[HANDLER] Ghi nhận diện tích: {data.Target} = {data.Value}");
    }
}
