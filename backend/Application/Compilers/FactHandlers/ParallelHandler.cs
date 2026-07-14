using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class ParallelHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Parallel;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<ObjectsData>(); 
        if (data == null || data.Objects == null || data.Objects.Count < 2) return;

        // e.g. "MN // AB". If M, A, B exist and N does not, we can build N (when MN length is also known)
        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        Console.WriteLine($"[HANDLER] Ghi nhận tính chất song song: {obj1} // {obj2}");
        // Point construction from parallelism still needs additional Length/Ratio facts.
    }
}
