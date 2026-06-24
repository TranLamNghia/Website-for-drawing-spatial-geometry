using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class DistanceHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Distance;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<DistanceData>();
        if (data == null || string.IsNullOrEmpty(data.From) || string.IsNullOrEmpty(data.To) || string.IsNullOrEmpty(data.Value)) return;

        Console.WriteLine($"[HANDLER] Ghi nhận khoảng cách: {data.From} -> {data.To} = {data.Value}");
    }
}
