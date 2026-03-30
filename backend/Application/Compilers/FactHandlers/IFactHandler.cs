using Application.DTOs;
using Application.DTOs.Enums;

namespace Application.Compilers.FactHandlers;

public interface IFactHandler
{
    // Xác định xem class này chuyên xử lý loại Fact nào
    FactType TargetFactType { get; }

    // Hàm thực thi logic
    void Handle(FactDto fact, CompilationContext context);
}