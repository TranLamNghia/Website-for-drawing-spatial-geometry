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

        // VD: "MN // AB". Nếu M, A, B đã có, N chưa có, ta có thể dựng N (khi biết thêm độ dài MN)
        string obj1 = data.Objects[0];
        string obj2 = data.Objects[1];

        Console.WriteLine($"[HANDLER] Ghi nhận tính chất song song: {obj1} // {obj2}");
        // Logic dựng điểm dựa trên song song sẽ cần kết hợp thêm Fact độ dài/tỉ lệ.
    }
}
