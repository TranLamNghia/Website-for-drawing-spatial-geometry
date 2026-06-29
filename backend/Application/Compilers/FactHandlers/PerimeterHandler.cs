using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;

namespace Application.Compilers.FactHandlers;

public class PerimeterHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Perimeter;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<PerimeterData>();
        string target;
        string value;

        if (data != null)
        {
            target = data.Target;
            value = data.Value;
        }
        else
        {
            var lengthData = fact.GetDataAs<LengthData>();
            if (lengthData == null) return;
            target = lengthData.Target;
            value = lengthData.Value;
        }

        if (string.IsNullOrEmpty(target) || string.IsNullOrEmpty(value)) return;
        Console.WriteLine($"[HANDLER] Ghi nhận chu vi: {target} = {value}");
    }
}
