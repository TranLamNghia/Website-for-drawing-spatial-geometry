using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class VolumeHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Volume;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<VolumeData>();
        if (data == null || string.IsNullOrEmpty(data.Target) || string.IsNullOrEmpty(data.Value)) return;

        Console.WriteLine($"[HANDLER] Ghi nhận thể tích: {data.Target} = {data.Value}");
    }
}
