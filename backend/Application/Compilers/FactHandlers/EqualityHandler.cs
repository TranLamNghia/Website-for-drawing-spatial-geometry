using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class EqualityHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Equality;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<EqualityData>();
        if (data?.Objects != null && data.Objects.Count >= 2)
        {
            Console.WriteLine($"[HANDLER] Ghi nhận bằng nhau: {string.Join(" = ", data.Objects)}");
            return;
        }

        if (!string.IsNullOrWhiteSpace(data?.Left) && !string.IsNullOrWhiteSpace(data?.Right))
        {
            Console.WriteLine($"[HANDLER] Ghi nhận bằng nhau: {data.Left} = {data.Right}");
        }
    }
}
