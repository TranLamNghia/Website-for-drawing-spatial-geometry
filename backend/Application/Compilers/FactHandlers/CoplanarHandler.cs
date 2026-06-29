using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class CoplanarHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Coplanar;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<CoplanarData>();
        var items = data?.Points ?? data?.Objects;
        if (items == null || items.Count == 0) return;

        Console.WriteLine($"[HANDLER] Ghi nhận đồng phẳng: {string.Join(", ", items)}");
    }
}
