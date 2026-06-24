using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class TangentHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Tangent;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<TangentData>();
        if (data?.Objects == null || data.Objects.Count < 2) return;

        var pointInfo = string.IsNullOrEmpty(data.Point) ? string.Empty : $" tại {data.Point}";
        Console.WriteLine($"[HANDLER] Ghi nhận tiếp tuyến: {data.Objects[0]} ~ {data.Objects[1]}{pointInfo}");
    }
}
