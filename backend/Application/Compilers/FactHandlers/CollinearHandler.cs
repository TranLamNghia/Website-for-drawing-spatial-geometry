using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class CollinearHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Collinear;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<CollinearData>();
        if (data?.Points == null || data.Points.Count == 0) return;

        Console.WriteLine($"[HANDLER] Ghi nhận thẳng hàng: {string.Join(", ", data.Points)}");
    }
}
